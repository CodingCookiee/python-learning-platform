Write `backoff_delay(attempt, *, base=0.5, cap=30.0, rng=random)` that returns how long to wait
before the next retry, using exponential backoff with **full jitter**:

- the ceiling doubles with each attempt: `base * 2 ** attempt`, where the first retry is attempt 0,
- but it's never more than `cap`,
- and the delay is a random number between 0 and that ceiling, from `rng.uniform(0, ceiling)`.

`rng` is anything with a `uniform` method: the `random` module by default, a seeded
`random.Random` in tests. Here `top` is a fake that always returns the highest value allowed:

```python
backoff_delay(0, rng=top)    # 0.5
backoff_delay(3, rng=top)    # 4.0
backoff_delay(10, rng=top)   # 30.0, capped
```
