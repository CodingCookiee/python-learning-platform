import time
from contextlib import contextmanager


@contextmanager
def timed_block(label, log, clock=time.perf_counter):
    """Log how long a block (or a decorated function) took, and whether it failed."""
    start = clock()
    try:
        yield
    except Exception:
        log.append(f"{label}: failed after {clock() - start:.2f}s")
        raise
    else:
        log.append(f"{label}: {clock() - start:.2f}s")
