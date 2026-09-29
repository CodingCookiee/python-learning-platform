import json

from plp import hidden, test
from plp_fakes import Reply, ScriptedLLM, tool_call
from solution import FINISH, AgentResult, Step, run_agent

SYSTEM = "You are the on-call helper for Kiln & Co's platform team. Investigate, then call finish."
TOOLS = [
    {"name": "get_error_rate", "description": "Current 5xx rate for a service.",
     "parameters": {"type": "object", "properties": {"service": {"type": "string"}}, "required": ["service"]}},
    {"name": "get_recent_deploys", "description": "Deploys to a service in the last hour.",
     "parameters": {"type": "object", "properties": {"service": {"type": "string"}}, "required": ["service"]}},
]
RAN = []


def get_error_rate(service):
    RAN.append("get_error_rate")
    return {"service": service, "error_rate": 0.071}


def get_recent_deploys(service):
    RAN.append("get_recent_deploys")
    if service != "checkout-api":
        raise LookupError(f"No service called {service}")
    return [{"id": "d-4417", "at": "02:06"}]


REGISTRY = {"get_error_rate": get_error_rate, "get_recent_deploys": get_recent_deploys}
TASK = "Alert: checkout-api 5xx rate is 7%."
ANSWER = "Errors began 4 minutes after deploy d-4417. Roll it back."


def script():
    return [
        tool_call("get_error_rate", service="checkout-api"),
        tool_call("get_recent_deploys", service="checkout-api"),
        tool_call("finish", answer=ANSWER),
    ]


@test("Works the example alert and finishes")
def _():
    RAN.clear()
    result = run_agent(ScriptedLLM(script()), TASK, TOOLS, REGISTRY, system=SYSTEM)
    assert isinstance(result, AgentResult)
    assert (result.answer, result.stop_reason, result.steps) == (ANSWER, "finished", 3)
    assert result.trace == [Step(1, "get_error_rate", {"service": "checkout-api"}, True),
                            Step(2, "get_recent_deploys", {"service": "checkout-api"}, True)]
    assert RAN == ["get_error_rate", "get_recent_deploys"]


@test("Offers the tools plus finish, with the system prompt, on every call")
def _():
    llm = ScriptedLLM(script())
    run_agent(llm, TASK, TOOLS, REGISTRY, system=SYSTEM)
    assert [call["tools"] == [*TOOLS, FINISH] for call in llm.calls] == [True, True, True]
    assert [call["system"] for call in llm.calls] == [SYSTEM] * 3


@test("Each observation goes back linked to its call")
def _():
    llm = ScriptedLLM(script())
    run_agent(llm, TASK, TOOLS, REGISTRY, system=SYSTEM)
    history = llm.calls[2]["messages"]
    assert [m["role"] for m in history] == ["user", "assistant", "tool", "assistant", "tool"]
    assert history[0]["content"] == TASK
    assert history[2]["tool_call_id"] == history[1]["tool_calls"][0]["id"]
    assert json.loads(history[4]["content"]) == [{"id": "d-4417", "at": "02:06"}]


@test("Unknown tools and failing tools become error observations")
def _():
    llm = ScriptedLLM([
        tool_call("restart_service", service="checkout-api"),
        tool_call("get_recent_deploys", service="checkout"),
        tool_call("finish", answer="Couldn't find the deploys."),
    ])
    result = run_agent(llm, TASK, TOOLS, REGISTRY)
    assert result.stop_reason == "finished"
    assert [(s.tool, s.ok) for s in result.trace] == [("restart_service", False), ("get_recent_deploys", False)]
    assert json.loads(llm.calls[1]["messages"][-1]["content"]) == {"error": "Unknown tool: restart_service"}
    assert json.loads(llm.calls[2]["messages"][-1]["content"]) == {"error": "No service called checkout"}


@test("Stops at the step cap with what it did so far")
def _():
    llm = ScriptedLLM([tool_call("get_error_rate", service="checkout-api")] * 3)
    result = run_agent(llm, TASK, TOOLS, REGISTRY, max_steps=3)
    assert (result.answer, result.stop_reason, result.steps) == (None, "step_limit", 3)
    assert [s.number for s in result.trace] == [1, 2, 3]
    assert len(llm.calls) == 3


@test("A plain reply stops with no_finish")
def _():
    llm = ScriptedLLM([tool_call("get_error_rate", service="checkout-api"), "The error rate is 7.1%."])
    result = run_agent(llm, TASK, TOOLS, REGISTRY)
    assert (result.answer, result.stop_reason, result.steps) == ("The error rate is 7.1%.", "no_finish", 2)


@hidden("Doesn't run calls made alongside finish")
def _():
    RAN.clear()
    llm = ScriptedLLM([Reply(tool_calls=[tool_call("get_error_rate", service="checkout-api"),
                                         tool_call("finish", answer=ANSWER)])])
    result = run_agent(llm, TASK, TOOLS, REGISTRY)
    assert (result.answer, result.stop_reason, result.steps, result.trace) == (ANSWER, "finished", 1, [])
    assert RAN == []


@hidden("Allows eight steps by default, and parallel calls share a step")
def _():
    pair = lambda: Reply(tool_calls=[tool_call("get_error_rate", service="checkout-api"),
                                     tool_call("get_recent_deploys", service="checkout-api")])
    llm = ScriptedLLM([pair() for _ in range(8)])
    result = run_agent(llm, TASK, TOOLS, REGISTRY)
    assert (result.stop_reason, result.steps, len(result.trace)) == ("step_limit", 8, 16)
    assert [s.number for s in result.trace[:4]] == [1, 1, 2, 2]
