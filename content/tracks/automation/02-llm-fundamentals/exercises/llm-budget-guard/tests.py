from decimal import Decimal

from plp import hidden, raises, test
from plp_fakes import Reply, ScriptedLLM, Usage
from solution import BudgetedLLM, BudgetExceeded

# EXAMPLE prices, invented for practice
PRICES = {
    "model-small": {"input": Decimal("0.50"), "output": Decimal("2.00")},
    "model-large": {"input": Decimal("12.00"), "output": Decimal("48.00")},
}
THREAD = [{"role": "user", "content": "x" * 400}]  # 100 tokens by the estimate


def summary(input_tokens=400, output_tokens=300):
    return Reply(text="Thread summary.", usage=Usage(input_tokens, output_tokens))


def budgeted(replies, budget="0.005", model="model-small"):
    inner = ScriptedLLM(replies, model=model)
    return inner, BudgetedLLM(inner, prices=PRICES, budget=Decimal(budget))


@test("Allows a call and records what it really cost, like the example")
def _():
    inner, llm = budgeted([summary()])
    assert llm.complete(THREAD, max_tokens=1_000).text == "Thread summary."
    assert llm.spent == Decimal("0.0008")
    assert llm.remaining == Decimal("0.0042")


@test("Refuses the call whose worst case would go over, without sending it")
def _():
    inner, llm = budgeted([summary()] * 5)
    for _ in range(4):
        llm.complete(THREAD, max_tokens=1_000)
    # 4 × $0.0008 spent; the next worst case is $0.00205, and 0.0032 + 0.00205 > 0.005
    raises(BudgetExceeded, llm.complete, THREAD, max_tokens=1_000)
    assert len(inner.calls) == 4, "a refused call must not reach the wrapped LLM"
    assert llm.spent == Decimal("0.0032")


@test("A smaller max_tokens can still fit")
def _():
    inner, llm = budgeted([summary()] * 5)
    for _ in range(4):
        llm.complete(THREAD, max_tokens=1_000)
    llm.complete(THREAD, max_tokens=500)
    assert len(inner.calls) == 5


@test("Counts the system prompt, and prices the model argument")
def _():
    inner, llm = budgeted([summary(100, 10)], budget="0.01321")
    # model-large: (100 + 1 for "Hi") × 12 / 1M + 250 × 48 / 1M = $0.013212, just over the budget
    raises(BudgetExceeded, llm.complete, THREAD, system="Hi", model="model-large", max_tokens=250)
    # ... but with max_tokens=249 it's $0.013164, which fits
    llm.complete(THREAD, system="Hi", model="model-large", max_tokens=249)
    assert inner.calls[0]["model"] == "model-large"
    assert llm.spent == Decimal("0.00168")


@test("Passes every argument through")
def _():
    inner, llm = budgeted([summary()], budget="1")
    llm.complete(THREAD, system="Summarise.", tools=None, max_tokens=300, temperature=0.2)
    call = inner.calls[0]
    assert (call["messages"], call["system"], call["max_tokens"], call["temperature"]) == (THREAD, "Summarise.", 300, 0.2)


@hidden("Exactly reaching the budget is allowed, and an unknown model is refused")
def _():
    # worst case for 100 input tokens and 1,000 output tokens is exactly $0.00205
    inner, llm = budgeted([summary()], budget="0.00205")
    llm.complete(THREAD, max_tokens=1_000)
    assert len(inner.calls) == 1
    inner, llm = budgeted([summary()], model="model-mystery")
    raises(ValueError, llm.complete, THREAD, match="model-mystery")
    assert inner.calls == []
