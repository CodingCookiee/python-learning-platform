from functools import wraps


def count_calls(func):
    """Decorate func so that func.calls counts how often it's been called."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)

    wrapper.calls = 0
    return wrapper
