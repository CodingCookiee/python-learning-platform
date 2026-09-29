from functools import wraps


def memoize(func):
    """Cache func's results by its arguments, with hits, misses and cache_clear()."""
    results = {}

    @wraps(func)
    def wrapper(*args, **kwargs):
        key = (args, frozenset(kwargs.items()))
        try:
            hash(key)
        except TypeError:
            return func(*args, **kwargs)
        if key in results:
            wrapper.hits += 1
            return results[key]
        wrapper.misses += 1
        result = func(*args, **kwargs)
        results[key] = result
        return result

    def cache_clear():
        results.clear()
        wrapper.hits = wrapper.misses = 0

    wrapper.hits = wrapper.misses = 0
    wrapper.cache_clear = cache_clear
    return wrapper
