import json

from plp import hidden, test
from plp_fakes import Reply, ScriptedLLM, tool_call
from solution import FINISH, NUDGE, Diagnosis, run_agent

TOOLS = [{"name": "get_recent_deploys", "description": "Deploys to a service in the last hour.",
          "parameters": {"type": "object", "properties": {"service": {"type": "string"}}, "required": ["service"]}}]
RAN = []


def get_recent_deploys(service):
    RAN.append(service)
    return [{"id": "d-4417", "at": "02:06"}]


REGISTRY = {"get_recent_deploys": get_recent_deploys}
TASK = "Alert: checkout-api 5xx rate is 7%."
GOOD = dict(summary="5xx errors since deploy d-4417", likely_cause="deploy",
            suggested_action="Roll back d-4417", evidence=["d-4417 deployed at 02:06"])


@test("A valid finish returns a Diagnosis")
def _():
    llm = ScriptedLLM([tool_call("get_recent_deploys", service="checkout-api"), tool_call("finish", **GOOD)])
    result = run_agent(llm, TASK, TOOLS, REGISTRY)
    assert (result.stop_reason, result.steps) == ("finished", 2)
    assert result.answer == Diagnosis(**GOOD)
    assert [call["tools"] == [*TOOLS, FINISH] for call in llm.calls] == [True, True]


@test("An invalid finish goes back as an error, and the run continues")
def _():
    bad = tool_call("finish", **{**GOOD, "likely_cause": "bad deploy"})
    llm = ScriptedLLM([bad, tool_call("finish", **GOOD)])
    result = run_agent(llm, TASK, TOOLS, REGISTRY)
    assert (result.stop_reason, result.steps) == ("finished", 2)
    history = llm.calls[1]["messages"]
    assert [m["role"] for m in history] == ["user", "assistant", "tool"]
    assert history[2]["tool_call_id"] == bad.id
    error = json.loads(history[2]["content"])["error"]
    assert error.startswith("finish arguments are invalid:") and "likely_cause" in error


@test("Every failing field is named")
def _():
    llm = ScriptedLLM([tool_call("finish", summary="Not sure", evidence=[]), tool_call("finish", **GOOD)])
    run_agent(llm, TASK, TOOLS, REGISTRY)
    error = json.loads(llm.calls[1]["messages"][-1]["content"])["error"]
    for name in ["likely_cause", "suggested_action", "evidence"]:
        assert name in error, f"The error should mention {name}: {error}"


@test("A plain reply is nudged once, then accepted as no_finish")
def _():
    llm = ScriptedLLM(["Looks like the deploy.", tool_call("finish", **GOOD)])
    assert run_agent(llm, TASK, TOOLS, REGISTRY).stop_reason == "finished"
    history = llm.calls[1]["messages"]
    assert [m["role"] for m in history] == ["user", "assistant", "user"]
    assert history[1]["content"] == "Looks like the deploy."
    assert history[2] == {"role": "user", "content": NUDGE}

    stubborn = ScriptedLLM(["Looks like the deploy.", "Definitely the deploy."])
    result = run_agent(stubborn, TASK, TOOLS, REGISTRY)
    assert (result.answer, result.stop_reason, result.steps) == (None, "no_finish", 2)


@test("Stops at the step cap")
def _():
    llm = ScriptedLLM([tool_call("finish", summary="?")] * 3)
    result = run_agent(llm, TASK, TOOLS, REGISTRY, max_steps=3)
    assert (result.answer, result.stop_reason, result.steps) == (None, "step_limit", 3)


@hidden("Calls next to an invalid finish don't run, but still get a result")
def _():
    RAN.clear()
    lookup, bad = tool_call("get_recent_deploys", service="checkout-api"), tool_call("finish", summary="?")
    llm = ScriptedLLM([Reply(tool_calls=[lookup, bad]), tool_call("finish", **GOOD)])
    result = run_agent(llm, TASK, TOOLS, REGISTRY)
    assert RAN == [] and result.trace == []
    results = llm.calls[1]["messages"][-2:]
    assert [m["tool_call_id"] for m in results] == [lookup.id, bad.id]
    assert json.loads(results[0]["content"]) == {"error": "Not run, because this turn called finish."}


@hidden("max_nudges=0 accepts no plain replies; max_nudges=2 allows two")
def _():
    assert run_agent(ScriptedLLM(["The deploy."]), TASK, TOOLS, REGISTRY, max_nudges=0).steps == 1
    llm = ScriptedLLM(["The deploy.", "Still the deploy.", tool_call("finish", **GOOD)])
    assert run_agent(llm, TASK, TOOLS, REGISTRY, max_nudges=2).stop_reason == "finished"
