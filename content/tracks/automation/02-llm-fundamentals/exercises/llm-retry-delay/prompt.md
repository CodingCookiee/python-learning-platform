Write `retry_delay(attempt, retry_after=None, *, base=1.0, cap=30.0)`, the number of seconds to wait
after a failed attempt (`attempt` counts from 0).

- When the provider sent a `retry_after` (in seconds, already parsed to a number), wait exactly
  that long: the provider knows when your limit resets.
- Otherwise use exponential backoff: `base × 2 ** attempt`, but never more than `cap`.

```python
[retry_delay(attempt) for attempt in range(6)]   # [1.0, 2.0, 4.0, 8.0, 16.0, 30.0]
retry_delay(2, retry_after=12.0)                 # 12.0
```
