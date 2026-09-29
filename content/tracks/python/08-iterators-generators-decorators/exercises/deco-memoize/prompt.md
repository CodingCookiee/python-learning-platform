Exchange-rate lookups hit a paid API, and the checkout asks for the same rates constantly. Write
your own caching decorator, `memoize(func)`, without using `functools.cache` or `lru_cache`:

- The first call with some arguments calls `func` and remembers the result. A later call with the
  same arguments returns the remembered result without calling `func`.
- Keyword arguments given in a different order count as the same arguments.
- `wrapper.hits` and `wrapper.misses` count calls answered from the cache and calls that ran
  `func`. `wrapper.cache_clear()` forgets every result and resets both counts to 0.
- If an argument can't be hashed (a list, say), the call runs `func` without caching and counts as
  neither a hit nor a miss.
- A call that raises isn't cached. The decorated function keeps its name and docstring.

```python
@memoize
def exchange_rate(source, target, *, day="today"):
    """Look up a rate from the (slow, paid) rates API."""
    return rates_api(source, target, day)

exchange_rate("GBP", "EUR")          # calls the API
exchange_rate("GBP", "EUR")          # from the cache
exchange_rate.hits, exchange_rate.misses   # (1, 1)
```
