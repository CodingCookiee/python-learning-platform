class OrderLines:
    """The (sku, quantity) lines of an order, usable like a sequence."""

    def __init__(self, lines):
        self._lines = list(lines)
