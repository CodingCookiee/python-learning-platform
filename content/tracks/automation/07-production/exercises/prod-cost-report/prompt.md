Every model call the client's services make is logged with its time, a pseudonymous user, the
feature that made it, the model and its token counts. Turn a week of those logs into the report
the client gets every Monday.

`usage` is a list of dicts with `"ts"` (an ISO 8601 time with an offset, like
`"2026-10-05T23:30:00+01:00"`), `"user"`, `"feature"`, `"model"`, `"input_tokens"` and
`"output_tokens"`. `prices` maps each model to `{"input": …, "output": …}` in dollars per million
tokens (floats; the drill's are example prices).

Write `cost_report(usage, prices)`, which returns a pandas `DataFrame` with one row per UTC day and
feature, and these columns in this order:

- `day`: the call's **UTC** date as `"YYYY-MM-DD"` (23:30 at +01:00 is 22:30 UTC, the same day);
- `feature`, `calls` (the number of calls), `input_tokens` and `output_tokens` (sums);
- `cost`: the total in dollars, rounded to 4 decimal places.

Rows are sorted by day, then by cost with the most expensive first, and numbered from 0. If any call
used a model with no price, raise `ValueError` naming every such model: a report that quietly drops
calls is worse than no report.

Then write `top_users(usage, prices, n=3)`: the `n` most expensive users over the whole log, as
`(user, cost)` pairs with the cost rounded to 4 places, most expensive first.

```python
usage = [
    {"ts": "2026-10-05T09:12:00Z", "user": "u_3f9a", "feature": "support_bot", "model": "model-small", "input_tokens": 1800, "output_tokens": 120},
    {"ts": "2026-10-05T09:13:10Z", "user": "u_3f9a", "feature": "support_bot", "model": "model-large", "input_tokens": 2400, "output_tokens": 300},
]
prices = {"model-small": {"input": 0.50, "output": 2.00}, "model-large": {"input": 12.00, "output": 48.00}}
cost_report(usage, prices).to_dict("records")
# [{'day': '2026-10-05', 'feature': 'support_bot', 'calls': 2, 'input_tokens': 4200, 'output_tokens': 420, 'cost': 0.0443}]
```
