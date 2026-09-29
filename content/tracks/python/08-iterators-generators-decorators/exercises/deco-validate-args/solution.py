import inspect
from functools import wraps


def validate(**checks):
    """Check the named arguments of every call with the given functions."""

    def decorate(func):
        signature = inspect.signature(func)
        for name in checks:
            if name not in signature.parameters:
                raise TypeError(f"{func.__name__} has no parameter {name!r} to validate")

        @wraps(func)
        def wrapper(*args, **kwargs):
            bound = signature.bind(*args, **kwargs)
            bound.apply_defaults()
            for name, check in checks.items():
                value = bound.arguments[name]
                if not check(value):
                    raise ValueError(f"{name}={value!r} failed {check.__name__}")
            return func(*args, **kwargs)

        return wrapper

    return decorate
