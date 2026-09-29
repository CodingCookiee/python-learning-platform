import json

import solution
from plp import hidden, test
from plp_fakes import ScriptedLLM, tool_call
from solution import work_alert

ALERT = "Alert: checkout-api 5xx rate is 7%."


def failing_forever(n=20):
    return ScriptedLLM([tool_call("get_error_rate", service="checkout-api") for _ in range(n)])


@test("Stops after six model calls when the tool keeps failing")
def _():
    llm = failing_forever()
    result = work_alert(llm, ALERT)
    assert (result.stop_reason, result.steps, result.answer) == ("step_limit", 6, None)
    assert len(llm.calls) == 6
    assert [s.ok for s in result.trace] == [False] * 6


@test("The trace shows what was tried, step by step")
def _():
    result = work_alert(failing_forever(), ALERT)
    assert [s.number for s in result.trace] == [1, 2, 3, 4, 5, 6]
    assert {s.tool for s in result.trace} == {"get_error_rate"}


@test("max_steps sets the cap")
def _():
    llm = failing_forever()
    assert work_alert(llm, ALERT, max_steps=2).steps == 2
    assert len(llm.calls) == 2


@test("A run that finishes works as before")
def _():
    llm = ScriptedLLM([tool_call("get_error_rate", service="checkout-api"),
                       tool_call("finish", answer="The metrics API is down, so I can't confirm the error rate. Page the platform team.")])
    result = work_alert(llm, ALERT)
    assert result.stop_reason == "finished" and result.steps == 2
    assert result.answer.startswith("The metrics API is down")
    assert json.loads(llm.calls[1]["messages"][-1]["content"]) == {"error": "metrics API did not answer within 10s"}


@hidden("A plain reply still ends the run")
def _():
    result = work_alert(ScriptedLLM(["I can't reach the metrics API."]), ALERT)
    assert (result.answer, result.stop_reason, result.steps) == ("I can't reach the metrics API.", "no_finish", 1)


@hidden("A working tool doesn't change the cap")
def _():
    solution.REGISTRY["get_error_rate"] = lambda service: {"service": service, "error_rate": 0.071}
    try:
        result = work_alert(failing_forever(), ALERT, max_steps=4)
    finally:
        solution.REGISTRY["get_error_rate"] = solution.get_error_rate
    assert (result.stop_reason, result.steps) == ("step_limit", 4)
    assert [s.ok for s in result.trace] == [True] * 4
