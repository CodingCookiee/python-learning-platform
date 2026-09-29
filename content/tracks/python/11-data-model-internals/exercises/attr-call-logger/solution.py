import functools


class CallLogger:
    """Stand in for target, recording every method call made through it in self.calls."""

    def __init__(self, target):
        object.__setattr__(self, "_target", target)
        object.__setattr__(self, "calls", [])

    def __getattr__(self, name):
        value = getattr(self._target, name)
        if not callable(value):
            return value

        @functools.wraps(value)
        def logged(*args, **kwargs):
            self.calls.append((name, args, kwargs))
            return value(*args, **kwargs)

        return logged

    def __setattr__(self, name, value):
        setattr(self._target, name, value)

    def __repr__(self):
        return f"CallLogger({self._target!r})"
