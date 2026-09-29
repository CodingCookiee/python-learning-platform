A nightly job summarises every open support thread. One night a 400-message thread ran it up to
ten times its usual cost. Write `BudgetedLLM(llm, *, prices, budget)`, a wrapper with the usual
`complete()` that never lets spending go over `budget` (a `Decimal`, in dollars).

Before each call, work out its **worst case**: the estimated input tokens (with `estimate_tokens`
from the starter, for the system prompt if there is one plus each message's `content`) at the input
price, plus `max_tokens` at the output price. The price is for the `model` argument, or the wrapped
LLM's `.model` when none is given.

- If `spent` plus the worst case would be more than `budget`, raise `BudgetExceeded` (from the
  starter) and don't call the wrapped LLM. Exactly reaching the budget is allowed.
- Otherwise pass the call through (every argument), add its **actual** cost from the response's
  usage to `spent`, and return the response.
- `spent` starts at `Decimal("0")`, and `remaining` (a property) is `budget - spent`.
- A model with no price raises `ValueError` naming it, before anything is sent.

```python
prices = {"model-small": {"input": Decimal("0.50"), "output": Decimal("2.00")}}   # EXAMPLE prices
llm = BudgetedLLM(ScriptedLLM(replies, model="model-small"), prices=prices, budget=Decimal("0.005"))
thread = [{"role": "user", "content": "x" * 400}]          # about 100 tokens
llm.complete(thread, max_tokens=1_000)
# worst case: 100 × 0.50 / 1M + 1,000 × 2.00 / 1M = $0.00205, so it's allowed
# if the reply used 400 input and 300 output tokens, llm.spent is now Decimal("0.0008")
```
