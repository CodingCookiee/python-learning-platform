import time
from contextlib import contextmanager


def timed_block(label, log, clock=time.perf_counter):
    """Log how long a block (or a decorated function) took, and whether it failed."""
    ...
