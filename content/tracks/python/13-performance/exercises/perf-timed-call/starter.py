import time


def timed(fn, *args, clock=time.perf_counter):
    """Call fn(*args) once. Return (result, elapsed milliseconds)."""
    ...
