`@cache` is wrong for an exchange rate: it would serve the first rate it fetched forever. But
fetching the rate for every order line is slow and costs money. The usual compromise is a cache
whose answers **expire**. Write the decorator factory `ttl_cache(seconds, clock=time.monotonic)`:

- The decorated function remembers each answer, keyed on the arguments it was called with
  (positional and keyword; all arguments are hashable).
- An answer is reused for calls less than `seconds` after it was computed. After that, the next
  call computes it again, and the new answer is reused for `seconds` from then.
- If the function raises, nothing is cached, and the next call tries again.
- The wrapper keeps the original function's name and docstring, and has a `cache_clear()` method
  that forgets everything.

```python
now = 0.0

@ttl_cache(60, clock=lambda: now)
def exchange_rate(currency):
    print("fetching", currency)
    return RATES[currency]

exchange_rate("EUR")   # prints "fetching EUR"
exchange_rate("EUR")   # cached: prints nothing
now = 60.0
exchange_rate("EUR")   # 60 seconds later it has expired: prints "fetching EUR"
```

`clock` is a function returning the current time in seconds, so tests can control time.
