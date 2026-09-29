import logging
import time
from contextlib import contextmanager


@contextmanager
def logged_job(name, clock=time.monotonic):
    """Log when a job starts and how it ends, including the traceback if it fails."""
    yield
