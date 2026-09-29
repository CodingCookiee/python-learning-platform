You've run a lead-classification eval on several models. Each result is a `Candidate(model, quality,
latency_ms, price)`: the share of eval cases it got right (0 to 1), its median latency, and its
`{"input", "output"}` prices per million tokens. Write:

- `cost_per_task(candidate, *, input_tokens, output_tokens)`: what one task of that size costs on
  that model, as a `Decimal`.
- `pick_model(candidates, *, input_tokens, output_tokens, min_quality, max_latency_ms)`: the
  candidate with the lowest cost per task among those with `quality` of at least `min_quality` and
  `latency_ms` of at most `max_latency_ms`. On a tie in cost, prefer higher quality, then lower
  latency. If no candidate qualifies, raise `ValueError`.

```python
# EXAMPLE prices, invented for practice
small = Candidate("model-small", 0.86, 420, {"input": Decimal("0.50"), "output": Decimal("2.00")})
medium = Candidate("model-medium", 0.95, 900, {"input": Decimal("2.50"), "output": Decimal("10.00")})
large = Candidate("model-large", 0.97, 2_100, {"input": Decimal("12.00"), "output": Decimal("48.00")})

cost_per_task(medium, input_tokens=1_800, output_tokens=120)   # Decimal("0.0057")
pick_model([small, medium, large], input_tokens=1_800, output_tokens=120,
           min_quality=0.93, max_latency_ms=1_500).model      # "model-medium"
```
