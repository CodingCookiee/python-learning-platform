import functools
import time


def ttl_cache(seconds, clock=time.monotonic):
    """A decorator that caches a function's answers for `seconds` after each is computed."""

    def decorator(fn):
        entries = {}  # key -> (answer, time it was computed)

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            now = clock()
            if key in entries:
                answer, computed_at = entries[key]
                if now - computed_at < seconds:
                    return answer
            answer = fn(*args, **kwargs)  # if this raises, nothing is stored
            entries[key] = (answer, now)
            return answer

        wrapper.cache_clear = entries.clear
        return wrapper

    return decorator
