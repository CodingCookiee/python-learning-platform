Write `TracedLLM(llm, tracer, *, prices, prompt_version)`, a wrapper with the usual `complete()`
that records one `"llm.complete"` span (with the `Tracer` in the starter) around every call to the
wrapped `llm`, so the invoice extractor gets traced without touching its code.

- Pass every argument through (`messages`, `system`, `tools`, `model`, `max_tokens`,
  `temperature`) and return the response unchanged.
- When the span opens, give it `prompt_version` and `requested_model` (the `model` argument, or the
  wrapped llm's `.model` when there isn't one).
- After a successful call, set `model` (the one the **response** names), `input_tokens`,
  `output_tokens`, `stop_reason`, `tool_calls` (a list of the tool names, `[]` for none) and
  `cost_usd`: a `Decimal` from `prices` for the response's model, in dollars per million tokens as
  in A2, or `None` when that model has no price.
- If the call raises, set `error_type` to the exception's class name and let the exception carry
  on. The tracer marks the span as an error.
- Never put message content, the system prompt or the tool definitions in the span.

```python
prices = {"model-small": {"input": Decimal("0.50"), "output": Decimal("2.00")}}   # EXAMPLE prices
llm = TracedLLM(ScriptedLLM([Reply("INV-2291", usage=Usage(1850, 96))], model="model-small"),
                tracer, prices=prices, prompt_version="invoice-v7")
llm.complete([{"role": "user", "content": "Kiln Supplies INV-2291 ..."}], temperature=0)
tracer.spans[0].attributes
# {'prompt_version': 'invoice-v7', 'requested_model': 'model-small', 'model': 'model-small',
#  'input_tokens': 1850, 'output_tokens': 96, 'stop_reason': 'end_turn', 'tool_calls': [],
#  'cost_usd': Decimal('0.001117')}
```
