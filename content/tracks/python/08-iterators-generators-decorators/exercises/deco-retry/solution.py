import time
from functools import wraps


def retry(times=3, *, exceptions=(ConnectionError, TimeoutError), delay=0.5, sleep=time.sleep):
    """Retry the decorated function on the given exceptions, doubling the wait each time."""
    if times < 1:
        raise ValueError("times must be at least 1")

    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    if attempt == times:
                        raise
                    sleep(delay * 2 ** (attempt - 1))

        return wrapper

    return decorate
