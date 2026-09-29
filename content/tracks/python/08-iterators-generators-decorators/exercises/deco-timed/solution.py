import time
from functools import wraps


def timed(func, *, clock=time.perf_counter, threshold=1.0):
    """Time every call to func with clock(); keep stats and a list of slow calls."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        start = clock()
        try:
            return func(*args, **kwargs)
        finally:
            elapsed = clock() - start
            wrapper.stats["calls"] += 1
            wrapper.stats["total"] += elapsed
            wrapper.stats["slowest"] = max(wrapper.stats["slowest"], elapsed)
            if elapsed > threshold:
                wrapper.slow_calls.append(f"{func.__name__} took {elapsed:.2f}s")

    wrapper.stats = {"calls": 0, "total": 0.0, "slowest": 0.0}
    wrapper.slow_calls = []
    return wrapper
