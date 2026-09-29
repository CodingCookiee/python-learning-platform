class OrderLines:
    """The (sku, quantity) lines of an order, usable like a sequence."""

    def __init__(self, lines):
        self._lines = list(lines)

    def __repr__(self):
        return f"OrderLines({self._lines!r})"

    def __eq__(self, other):
        if not isinstance(other, OrderLines):
            return NotImplemented
        return self._lines == other._lines

    def __len__(self):
        return len(self._lines)

    def __getitem__(self, index):
        if isinstance(index, slice):
            return OrderLines(self._lines[index])
        return self._lines[index]

    def __iter__(self):
        return iter(self._lines)

    def __contains__(self, sku):
        return any(line_sku == sku for line_sku, _ in self._lines)
