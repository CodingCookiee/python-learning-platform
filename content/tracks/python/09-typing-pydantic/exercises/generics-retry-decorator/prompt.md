The exchange-rate API drops a connection now and then. Write a decorator factory,
`retry(times, *, on=Exception)`, that calls the decorated function up to `times` times while it
raises `on` (or a subclass of it):

- If a call succeeds, return its result straight away.
- If every attempt raises, let the last exception propagate.
- An exception that isn't an `on` is never retried: it propagates from the first attempt.
- `retry(0)` (or any `times` below 1) raises `ValueError` immediately, before decorating anything.

Type it with a `ParamSpec`, so the decorated function keeps its signature and mypy still checks
every call to it. Keep the name with `functools.wraps`, and make `mypy --strict` pass. `fetch_rate`
at the bottom of the file shows it in use; keep it.

```python
@retry(3, on=ConnectionError)
def fetch_rate(currency: str) -> float: ...

fetch_rate("GBP")     # 0.86, even if the first two attempts raise ConnectionError
fetch_rate(1)         # rejected by mypy: fetch_rate takes a str
retry(0)              # ValueError: times must be at least 1
```
