import time
from functools import wraps


def timed(func, *, clock=time.perf_counter, threshold=1.0):
    """Time every call to func with clock(); keep stats and a list of slow calls."""
    ...
