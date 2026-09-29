class Sku:
    """A product code. Codes are case-insensitive, so they're stored upper-case."""

    def __init__(self, code):
        self.code = code.upper()

    def __repr__(self):
        return f"Sku({self.code!r})"

    def __eq__(self, other):
        if not isinstance(other, Sku):
            return NotImplemented
        return self.code == other.code

    def __hash__(self):
        return hash(self.code)


class StockBook:
    def __init__(self):
        self._counts = {}

    def add(self, sku, quantity):
        self._counts[sku] = self._counts.get(sku, 0) + quantity

    def count(self, sku):
        return self._counts.get(sku, 0)

    def rename(self, sku, new_code):
        """The supplier changed a product code: keep its stock under the new code."""
        for key in self._counts:
            if key == sku:
                key.code = new_code.upper()
