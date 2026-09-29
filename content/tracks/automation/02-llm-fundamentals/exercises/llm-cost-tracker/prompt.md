Write `CostTracker(llm, prices)`, a wrapper that behaves exactly like the LLM it wraps and records
what every call cost. `prices` maps a model name to `{"input": Decimal, "output": Decimal}` in
dollars per million tokens.

- `complete(messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None)`
  passes every argument on to the wrapped `llm`, records the call, and returns the response
  unchanged.
- Each call adds a `CallRecord(model, input_tokens, output_tokens, cost)` to `.records`, using the
  model the **response** names. A model missing from `prices` raises `ValueError` naming it.
- `total_cost` (a property) is the sum of every record's cost, as a `Decimal` (`Decimal("0")` before
  any calls).
- `cost_by_model()` returns a dict of model → total cost, in the order models were first used.

```python
prices = {"model-small": {"input": Decimal("0.50"), "output": Decimal("2.00")}}   # EXAMPLE prices
llm = CostTracker(ScriptedLLM([Reply(text="Cracked screen on #1042.", usage=Usage(1_800, 120))], model="model-small"), prices)
llm.complete([{"role": "user", "content": "Summarise ticket #1042"}]).text   # "Cracked screen on #1042."
llm.records     # [CallRecord(model="model-small", input_tokens=1800, output_tokens=120, cost=Decimal("0.00114"))]
llm.total_cost  # Decimal("0.00114")
```
