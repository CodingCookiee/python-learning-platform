import time


def race(candidates, data, repeat=5, clock=time.perf_counter):
    """Time each candidate function on the same data.

    candidates maps a name to a function that takes the data. Returns a dict of
    name -> best time in seconds, fastest first.
    """
    results = {}
    for name, fn in candidates.items():
        best = float("inf")
        for _ in range(repeat):
            start = clock()
            fn(data)
            best = min(best, clock() - start)
        results[name] = best
    return dict(sorted(results.items(), key=lambda item: item[1]))
