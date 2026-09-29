from decimal import Decimal

from plp import hidden, test
from plp_fakes import Reply, ScriptedLLM, Usage, tool_call
from solution import FINISH, GuardedResult, Limits, run_guarded

TOOLS = [{"name": "get_error_rate", "description": "Current 5xx rate for a service.",
          "parameters": {"type": "object", "properties": {"service": {"type": "string"}, "minutes": {"type": "integer"}},
                         "required": ["service"]}}]
RAN = []


def get_error_rate(service, minutes=15):
    RAN.append((service, minutes))
    return {"service": service, "minutes": minutes, "error_rate": 0.071}


REGISTRY = {"get_error_rate": get_error_rate}
TASK = "Alert: checkout-api 5xx rate is 7%."
USAGE = Usage(1_000, 200)         # $0.006 a call at the example prices


class FakeClock:
    def __init__(self):
        self.now = 5_000.0

    def __call__(self):
        return self.now


def taking(clock, seconds, reply):
    def answer(request):
        clock.now += seconds
        return reply
    return answer


def rate(minutes):
    return Reply(tool_calls=[tool_call("get_error_rate", service="checkout-api", minutes=minutes)], usage=USAGE)


@test("Stops at the deadline before the next call, as in the example")
def _():
    clock = FakeClock()
    llm = ScriptedLLM([taking(clock, 25, rate(m)) for m in (5, 15, 60, 240, 1440)])
    result = run_guarded(llm, TASK, TOOLS, REGISTRY, limits=Limits(max_seconds=60), clock=clock)
    assert (result.stop_reason, result.steps) == ("timeout", 3)
    assert len(llm.calls) == 3
    assert result.cost == Decimal("0.018")


@test("A normal run finishes, with its cost from usage")
def _():
    llm = ScriptedLLM([rate(15), Reply(tool_calls=[tool_call("finish", answer="Error rate is 7.1%; see deploy d-4417.")],
                                       usage=Usage(1_400, 80))])
    result = run_guarded(llm, TASK, TOOLS, REGISTRY, limits=Limits(), clock=FakeClock())
    assert result == GuardedResult("Error rate is 7.1%; see deploy d-4417.", "finished", 2, Decimal("0.006") + Decimal("0.0054"))
    assert [call["tools"] == [*TOOLS, FINISH] for call in llm.calls] == [True, True]
    assert all(call["max_tokens"] == 500 for call in llm.calls)


@test("Stops before a call that could go over the budget")
def _():
    llm = ScriptedLLM([rate(m) for m in (5, 15, 60, 240, 1440, 5, 15)])
    result = run_guarded(llm, TASK, TOOLS, REGISTRY, limits=Limits(max_cost=Decimal("0.021")), clock=FakeClock())
    assert (result.stop_reason, result.steps, result.cost) == ("budget", 3, Decimal("0.018"))
    assert result.cost <= Decimal("0.021")


@test("Stops a loop of identical calls before running the repeat")
def _():
    RAN.clear()
    same = lambda: Reply(tool_calls=[tool_call("get_error_rate", service="checkout-api", minutes=15)], usage=USAGE)
    llm = ScriptedLLM([same() for _ in range(5)])
    result = run_guarded(llm, TASK, TOOLS, REGISTRY, limits=Limits(), clock=FakeClock())
    assert (result.stop_reason, result.steps) == ("loop", 3)
    assert RAN == [("checkout-api", 15), ("checkout-api", 15)]


@test("The step cap still applies")
def _():
    llm = ScriptedLLM([rate(m) for m in (1, 2, 3, 4)])
    result = run_guarded(llm, TASK, TOOLS, REGISTRY, limits=Limits(max_steps=4), clock=FakeClock())
    assert (result.stop_reason, result.steps) == ("step_limit", 4)


@hidden("The deadline is checked before the budget, and argument order doesn't hide a loop")
def _():
    clock = FakeClock()
    llm = ScriptedLLM([taking(clock, 90, rate(5))])
    result = run_guarded(llm, TASK, TOOLS, REGISTRY, limits=Limits(max_seconds=60, max_cost=Decimal("0.009")), clock=clock)
    assert (result.stop_reason, result.steps) == ("timeout", 1)

    first = Reply(tool_calls=[tool_call("get_error_rate", service="checkout-api", minutes=15)], usage=USAGE)
    second = Reply(tool_calls=[tool_call("get_error_rate", minutes=15, service="checkout-api")], usage=USAGE)
    result = run_guarded(ScriptedLLM([first, second]), TASK, TOOLS, REGISTRY, limits=Limits(max_repeats=2), clock=FakeClock())
    assert (result.stop_reason, result.steps) == ("loop", 2)


@hidden("A plain reply ends the run")
def _():
    result = run_guarded(ScriptedLLM([Reply(text="It's the deploy.", usage=USAGE)]), TASK, TOOLS, REGISTRY,
                         limits=Limits(), clock=FakeClock())
    assert result == GuardedResult("It's the deploy.", "no_finish", 1, Decimal("0.006"))
