from functools import wraps


class GeneratorContextManager:
    """Drives one generator through a with block."""

    def __init__(self, gen):
        self.gen = gen

    def __enter__(self):
        try:
            return next(self.gen)
        except StopIteration:
            raise RuntimeError("generator didn't yield") from None

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            try:
                next(self.gen)
            except StopIteration:
                return False
            raise RuntimeError("generator didn't stop")
        try:
            self.gen.throw(exc)
        except StopIteration:
            return True
        except BaseException as raised:
            if raised is exc:
                return False
            raise
        raise RuntimeError("generator didn't stop after throw()")


def my_contextmanager(func):
    """Turn a generator function into a context manager factory."""

    @wraps(func)
    def factory(*args, **kwargs):
        return GeneratorContextManager(func(*args, **kwargs))

    return factory
