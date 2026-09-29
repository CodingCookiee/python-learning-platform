class Collector:
    """Suppress and remember exceptions of the given types raised inside with blocks."""

    def __init__(self, *types):
        ...

    def summary(self):
        """One "<type name>: <message>" line per collected error."""
        ...
