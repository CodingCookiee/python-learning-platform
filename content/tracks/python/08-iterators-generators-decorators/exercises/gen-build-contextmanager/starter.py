from functools import wraps


class GeneratorContextManager:
    """Drives one generator through a with block."""

    def __init__(self, gen):
        self.gen = gen

    def __enter__(self):
        ...

    def __exit__(self, exc_type, exc, tb):
        ...


def my_contextmanager(func):
    """Turn a generator function into a context manager factory."""
    ...
