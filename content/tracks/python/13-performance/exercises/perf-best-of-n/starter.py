import time


def time_it(fn, *, number=1, repeat=5, clock=time.perf_counter):
    """The best time per call of fn(), in seconds, from repeat rounds of number calls."""
    ...
