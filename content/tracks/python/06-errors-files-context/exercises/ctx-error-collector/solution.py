class Collector:
    """Suppress and remember exceptions of the given types raised inside with blocks."""

    def __init__(self, *types):
        self.types = types
        self.errors = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None or not issubclass(exc_type, self.types):
            return False
        self.errors.append(exc)
        return True

    def summary(self):
        """One "<type name>: <message>" line per collected error."""
        return [f"{type(error).__name__}: {error}" for error in self.errors]
