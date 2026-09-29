import time


def time_it(fn, *, number=1, repeat=5, clock=time.perf_counter):
    """The best time per call of fn(), in seconds, from repeat rounds of number calls."""
    if number < 1 or repeat < 1:
        raise ValueError("number and repeat must both be at least 1")
    per_call = []
    for _ in range(repeat):
        start = clock()
        for _ in range(number):
            fn()
        per_call.append((clock() - start) / number)
    return min(per_call)
