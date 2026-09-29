import json

from plp import hidden, raises, test
from plp_fakes import Reply, ScriptedLLM, tool_call
from solution import PlanError, PlanRun, answer_prompt, plan_and_execute, planner_prompt, step_prompt


def tool(name):
    return {"name": name, "description": f"{name} for an account.",
            "parameters": {"type": "object", "properties": {"account_id": {"type": "string"}}, "required": ["account_id"]}}


TOOLS = [tool("get_account"), tool("get_open_tickets"), tool("get_unpaid_invoices")]
RAN = []


def get_account(account_id):
    RAN.append("get_account")
    return {"name": "Harbour Dental", "renews": "2026-10-02"}


def get_open_tickets(account_id):
    RAN.append("get_open_tickets")
    return [{"id": "T-881", "subject": "Export fails"}]


def get_unpaid_invoices(account_id):
    RAN.append("get_unpaid_invoices")
    raise TimeoutError("billing API timed out")


REGISTRY = {"get_account": get_account, "get_open_tickets": get_open_tickets, "get_unpaid_invoices": get_unpaid_invoices}
GOAL = "Prepare the renewal call with Harbour Dental (C-301)"
PLAN_TEXT = "1. Look up the account\n2. List open tickets\n3. Write the brief"
PLAN = ["Look up the account", "List open tickets", "Write the brief"]
ANSWER = "Harbour Dental renews on 2 October. Fix T-881 (export fails) before the call."


def script():
    return [PLAN_TEXT, tool_call("get_account", account_id="C-301"), tool_call("get_open_tickets", account_id="C-301"),
            "Ready to write.", ANSWER]


@test("Plans, runs each step, and answers")
def _():
    RAN.clear()
    llm = ScriptedLLM(script())
    run = plan_and_execute(llm, GOAL, TOOLS, REGISTRY)
    assert run == PlanRun(PLAN, [json.dumps([get_account("C-301")]), json.dumps([get_open_tickets("C-301")]), "Ready to write."], ANSWER)
    assert RAN[:2] == ["get_account", "get_open_tickets"]
    assert len(llm.calls) == 5


@test("The planner gets the planner prompt and no tools")
def _():
    llm = ScriptedLLM(script())
    plan_and_execute(llm, GOAL, TOOLS, REGISTRY)
    assert llm.calls[0]["messages"] == [{"role": "user", "content": planner_prompt(GOAL, TOOLS)}]
    assert llm.calls[0]["tools"] in (None, [])


@test("Each step call carries the results so far, with the tools")
def _():
    llm = ScriptedLLM(script())
    run = plan_and_execute(llm, GOAL, TOOLS, REGISTRY)
    for number in (1, 2, 3):
        call = llm.calls[number]
        assert call["messages"] == [{"role": "user", "content": step_prompt(GOAL, PLAN, number, run.results[:number - 1])}]
        assert call["tools"] == TOOLS
    assert llm.calls[4]["messages"] == [{"role": "user", "content": answer_prompt(GOAL, PLAN, run.results)}]
    assert llm.calls[4]["tools"] in (None, [])


@test("A plan that's too long or empty never runs")
def _():
    RAN.clear()
    long_plan = ScriptedLLM(["\n".join(f"{n}. Step {n}" for n in range(1, 8))])
    raises(PlanError, plan_and_execute, long_plan, GOAL, TOOLS, REGISTRY)
    raises(PlanError, plan_and_execute, ScriptedLLM(["I'll just answer directly."]), GOAL, TOOLS, REGISTRY)
    assert RAN == []
    assert len(long_plan.calls) == 1


@hidden("A failing tool becomes an error in that step's result")
def _():
    llm = ScriptedLLM(["1. Check unpaid invoices\n2. Write the brief", tool_call("get_unpaid_invoices", account_id="C-301"),
                       "Billing was unavailable.", "No invoice data; everything else looks fine."])
    run = plan_and_execute(llm, GOAL, TOOLS, REGISTRY)
    assert json.loads(run.results[0]) == [{"error": "billing API timed out"}]


@hidden("Parallel calls in one step share one result, in order; max_plan_steps is honoured")
def _():
    llm = ScriptedLLM(["1. Look up the account and its tickets\n2. Write the brief",
                       Reply(tool_calls=[tool_call("get_account", account_id="C-301"), tool_call("get_open_tickets", account_id="C-301")]),
                       "Done.", ANSWER])
    run = plan_and_execute(llm, GOAL, TOOLS, REGISTRY, max_plan_steps=2)
    assert json.loads(run.results[0]) == [get_account("C-301"), get_open_tickets("C-301")]
    raises(PlanError, plan_and_execute, ScriptedLLM([PLAN_TEXT]), GOAL, TOOLS, REGISTRY, max_plan_steps=2)
