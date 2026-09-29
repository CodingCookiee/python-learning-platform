import json

from plp import hidden, test
from plp_fakes import Reply, ScriptedLLM, tool_call
from solution import DECLINED, FINISH, Outcome, resume_run, start_run

TOOLS = [{"name": "get_error_rate", "description": "Current 5xx rate.", "parameters": {"type": "object", "properties": {}}},
         {"name": "restart_service", "description": "Restart a service. Needs approval.", "parameters": {"type": "object", "properties": {}}}]
RAN = []


def get_error_rate(service):
    RAN.append(("get_error_rate", service))
    return {"service": service, "error_rate": 0.071}


def restart_service(service):
    RAN.append(("restart_service", service))
    return {"restarted": service}


REGISTRY = {"get_error_rate": get_error_rate, "restart_service": restart_service}
RISKY = {"restart_service"}
TASK = "checkout-api is failing"


def paused_run():
    RAN.clear()
    restart = tool_call("restart_service", service="checkout-api")
    llm = ScriptedLLM([tool_call("get_error_rate", service="checkout-api"), restart])
    return start_run(llm, TASK, TOOLS, REGISTRY, risky=RISKY), llm, restart


@test("Pauses at the risky call, as in the example")
def _():
    outcome, llm, restart = paused_run()
    assert outcome.status == "paused"
    assert outcome.pending == [{"id": restart.id, "name": "restart_service", "arguments": {"service": "checkout-api"}}]
    assert RAN == [("get_error_rate", "checkout-api")], "Nothing risky runs before a person says yes"
    assert len(llm.calls) == 2
    assert [call["tools"] == [*TOOLS, FINISH] for call in llm.calls] == [True, True]


@test("The saved state is plain JSON with the history, the pending calls and the steps")
def _():
    outcome, _, restart = paused_run()
    state = json.loads(outcome.state)
    assert set(state) == {"messages", "pending", "steps"}
    assert [m["role"] for m in state["messages"]] == ["user", "assistant", "tool", "assistant"]
    assert state["pending"] == [{"id": restart.id, "name": "restart_service", "arguments": {"service": "checkout-api"}}]
    assert state["steps"] == 2


@test("Approved: resumes in a new run, restarts, and finishes")
def _():
    outcome, _, restart = paused_run()
    later = ScriptedLLM([tool_call("finish", answer="Restarted checkout-api; the error rate is back to normal.")])
    result = resume_run(later, outcome.state, approved=True, tools=TOOLS, registry=REGISTRY, risky=RISKY)
    assert result == Outcome("finished", answer="Restarted checkout-api; the error rate is back to normal.")
    assert RAN[-1] == ("restart_service", "checkout-api")
    last = later.calls[0]["messages"][-1]
    assert last["role"] == "tool" and last["tool_call_id"] == restart.id
    assert json.loads(last["content"]) == {"restarted": "checkout-api"}


@test("Declined: the tool never runs, and the model is told")
def _():
    outcome, _, _ = paused_run()
    later = ScriptedLLM(["I didn't restart checkout-api. I'd suggest restarting it once traffic is lower."])
    result = resume_run(later, outcome.state, approved=False, tools=TOOLS, registry=REGISTRY, risky=RISKY)
    assert result.status == "no_finish"
    assert ("restart_service", "checkout-api") not in RAN
    assert json.loads(later.calls[0]["messages"][-1]["content"]) == {"error": DECLINED.format(name="restart_service")}


@test("The step cap counts steps from before the pause")
def _():
    outcome, _, _ = paused_run()
    later = ScriptedLLM([tool_call("get_error_rate", service="checkout-api"), tool_call("get_error_rate", service="cart")])
    result = resume_run(later, outcome.state, approved=True, tools=TOOLS, registry=REGISTRY, risky=RISKY, max_steps=3)
    assert result.status == "step_limit"
    assert len(later.calls) == 1


@hidden("Calls made alongside a risky one wait too, then run in order")
def _():
    RAN.clear()
    check, restart = tool_call("get_error_rate", service="checkout-api"), tool_call("restart_service", service="checkout-api")
    outcome = start_run(ScriptedLLM([Reply(tool_calls=[check, restart])]), TASK, TOOLS, REGISTRY, risky=RISKY)
    assert outcome.status == "paused" and RAN == []
    assert [c["name"] for c in outcome.pending] == ["restart_service"]
    later = ScriptedLLM(["Done."])
    resume_run(later, outcome.state, approved=False, tools=TOOLS, registry=REGISTRY, risky=RISKY)
    assert RAN == [("get_error_rate", "checkout-api")]
    results = later.calls[0]["messages"][-2:]
    assert [m["tool_call_id"] for m in results] == [check.id, restart.id]
    assert "error" in json.loads(results[1]["content"])


@hidden("Runs without risky calls never pause")
def _():
    llm = ScriptedLLM([tool_call("get_error_rate", service="checkout-api"), tool_call("finish", answer="7.1% errors.")])
    assert start_run(llm, TASK, TOOLS, REGISTRY, risky=RISKY) == Outcome("finished", answer="7.1% errors.")
