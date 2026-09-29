from decimal import Decimal

from plp import hidden, raises, test
from plp_fakes import Reply, ScriptedLLM, Usage
from solution import CallRecord, CostTracker

# EXAMPLE prices, invented for practice
PRICES = {
    "model-small": {"input": Decimal("0.50"), "output": Decimal("2.00")},
    "model-large": {"input": Decimal("12.00"), "output": Decimal("48.00")},
}
TICKET = [{"role": "user", "content": "Summarise ticket #1042"}]


def reply(input_tokens, output_tokens, text="Cracked screen on #1042."):
    return Reply(text=text, usage=Usage(input_tokens, output_tokens))


@test("Records one call and its cost, like the example")
def _():
    llm = CostTracker(ScriptedLLM([reply(1_800, 120)], model="model-small"), PRICES)
    assert llm.complete(TICKET).text == "Cracked screen on #1042."
    assert llm.records == [CallRecord(model="model-small", input_tokens=1800, output_tokens=120, cost=Decimal("0.00114"))]
    assert llm.total_cost == Decimal("0.00114")


@test("Passes every argument through to the wrapped LLM")
def _():
    inner = ScriptedLLM([reply(10, 5)], model="model-small")
    tools = [{"name": "lookup_order", "description": "Find an order.", "parameters": {"type": "object", "properties": {}}}]
    CostTracker(inner, PRICES).complete(TICKET, system="Be brief.", tools=tools, model="model-large", max_tokens=50, temperature=0.2)
    call = inner.calls[0]
    assert call["messages"] == TICKET
    assert (call["system"], call["tools"], call["model"], call["max_tokens"], call["temperature"]) == (
        "Be brief.", tools, "model-large", 50, 0.2,
    )


@test("Returns the wrapped LLM's response unchanged")
def _():
    inner = ScriptedLLM([reply(10, 5, text="Refund approved.")], model="model-small")
    response = CostTracker(inner, PRICES).complete(TICKET)
    assert (response.text, response.model, response.usage) == ("Refund approved.", "model-small", Usage(10, 5))


@test("Totals several calls, per model, using the model the response names")
def _():
    inner = ScriptedLLM([reply(1_000, 100), reply(2_000, 200), reply(1_000, 100)], model="model-small")
    llm = CostTracker(inner, PRICES)
    llm.complete(TICKET)
    llm.complete(TICKET, model="model-large")
    llm.complete(TICKET)
    assert [record.model for record in llm.records] == ["model-small", "model-large", "model-small"]
    assert llm.cost_by_model() == {"model-small": Decimal("0.0014"), "model-large": Decimal("0.0336")}
    assert list(llm.cost_by_model()) == ["model-small", "model-large"]
    assert llm.total_cost == Decimal("0.035")


@hidden("Starts at zero, and refuses a model with no price")
def _():
    llm = CostTracker(ScriptedLLM([reply(10, 5)], model="model-mystery"), PRICES)
    assert llm.total_cost == Decimal("0") and isinstance(llm.total_cost, Decimal)
    assert llm.cost_by_model() == {}
    raises(ValueError, llm.complete, TICKET, match="model-mystery")
