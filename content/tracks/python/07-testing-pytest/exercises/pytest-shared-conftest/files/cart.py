from dataclasses import dataclass


@dataclass
class Customer:
    name: str
    member: bool = False


class Cart:
    """A shopping cart. Prices are in pence."""

    def __init__(self):
        self._lines = {}  # sku -> [quantity, unit_price]

    def add(self, sku, quantity, unit_price):
        """Add units of a product. Adding a SKU that's already there adds to its quantity."""
        if sku in self._lines:
            self._lines[sku][0] += quantity
        else:
            self._lines[sku] = [quantity, unit_price]

    @property
    def item_count(self):
        """How many units are in the cart."""
        return sum(quantity for quantity, _ in self._lines.values())

    @property
    def total_pence(self):
        return sum(quantity * price for quantity, price in self._lines.values())

    def total_for(self, customer):
        """What the customer pays: members get 10% off orders of 1000p or more."""
        total = self.total_pence
        if customer.member and total >= 1000:
            total -= total // 10
        return total
