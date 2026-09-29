import functools
import time


def ttl_cache(seconds, clock=time.monotonic):
    """A decorator that caches a function's answers for `seconds` after each is computed."""
    ...
