class StockLevels:
    """Units in stock for each SKU."""

    def __init__(self, levels):
        self._levels = dict(levels)

    def __getitem__(self, sku):
        return self._levels[sku]

    def __contains__(self, sku):
        return sku in self._levels

    def __iter__(self):
        return iter(self._levels)

    def __len__(self):
        return len(self._levels)

    def low_stock(self, threshold):
        """SKUs with fewer than threshold units, sorted."""
        return sorted(sku for sku in self if self[sku] < threshold)


def restock_message(levels, sku):
    if not levels:
        return "No stock data loaded"
    if sku not in levels:
        return f"{sku}: not stocked"
    return f"{sku}: {levels[sku]} in stock"
