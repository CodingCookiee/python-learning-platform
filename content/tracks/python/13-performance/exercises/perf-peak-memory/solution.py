import tracemalloc


def peak_kib(fn, *args):
    """Call fn(*args). Return (result, peak memory in KiB during the call)."""
    tracemalloc.start()
    try:
        result = fn(*args)
        _, peak = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()
    return result, round(peak / 1024, 1)
