import time
from functools import wraps


def retry(times=3, *, exceptions=(ConnectionError, TimeoutError), delay=0.5, sleep=time.sleep):
    """Retry the decorated function on the given exceptions, doubling the wait each time."""
    ...
