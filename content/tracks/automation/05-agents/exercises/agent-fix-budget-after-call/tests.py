from decimal import Decimal

from plp import hidden, test
from plp_fakes import Reply, ScriptedLLM, Usage, tool_call
from solution import AgentResult, Budget, run_agent

TOOLS = [{"name": "list_overdue", "description": "Overdue invoices for a client.",
          "parameters": {"type": "object", "properties": {"client": {"type": "string"}}, "required": ["client"]}},
         {"name": "finish", "description": "Call this once, when you're done.",
          "parameters": {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]}}]
REGISTRY = {"list_overdue": lambda client: [{"number": "INV-2291", "days_overdue": 18}]}
TASK = "Which of Harbour Dental's invoices need chasing?"


def lookups(n):
    return [Reply(tool_calls=[tool_call("list_overdue", client="Harbour Dental")], usage=Usage(1_000, 200)) for _ in range(n)]


@test("Stops before the call that could go over, as in the example")
def _():
    llm = ScriptedLLM(lookups(6))
    budget = Budget(Decimal("0.0205"))
    assert run_agent(llm, TASK, TOOLS, REGISTRY, budget=budget) == AgentResult(None, "budget", 3)
    assert len(llm.calls) == 3
    assert budget.spent == Decimal("0.018")


@test("Spending never passes the limit")
def _():
    for limit in ["0.009", "0.0145", "0.0205", "0.03"]:
        budget = Budget(Decimal(limit))
        run_agent(ScriptedLLM(lookups(10)), TASK, TOOLS, REGISTRY, budget=budget)
        assert budget.spent <= budget.limit, f"With a limit of ${limit} the run spent ${budget.spent}"


@test("A budget too small for one call makes no calls")
def _():
    llm = ScriptedLLM(lookups(1))
    budget = Budget(Decimal("0.001"))
    assert run_agent(llm, TASK, TOOLS, REGISTRY, budget=budget) == AgentResult(None, "budget", 0)
    assert llm.calls == [] and budget.spent == 0


@test("A run within budget finishes as before")
def _():
    llm = ScriptedLLM(lookups(1) + [Reply(tool_calls=[tool_call("finish", answer="Chase INV-2291.")], usage=Usage(1_200, 60))])
    budget = Budget(Decimal("0.05"))
    assert run_agent(llm, TASK, TOOLS, REGISTRY, budget=budget) == AgentResult("Chase INV-2291.", "finished", 2)
    assert budget.spent == Decimal("0.006") + Decimal("0.0045")


@hidden("Exactly reaching the limit is allowed")
def _():
    budget = Budget(Decimal("0"))
    exact = budget.worst_case([{"role": "user", "content": TASK}], system=None, tools=TOOLS, max_tokens=500)
    budget = Budget(exact)
    llm = ScriptedLLM(lookups(3))
    result = run_agent(llm, TASK, TOOLS, REGISTRY, budget=budget)
    assert (result.stop_reason, result.steps) == ("budget", 1)
