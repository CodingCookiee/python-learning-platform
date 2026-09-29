import time


def timed(fn, *args, clock=time.perf_counter):
    """Call fn(*args) once. Return (result, elapsed milliseconds)."""
    start = clock()
    result = fn(*args)
    elapsed_ms = (clock() - start) * 1000
    return result, elapsed_ms
