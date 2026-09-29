Here's the shop's cart:

```python
# cart.py
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

    def remove(self, sku):
        """Take a product out of the cart entirely."""
        del self._lines[sku]

    @property
    def item_count(self):
        """How many units are in the cart."""
        return sum(quantity for quantity, _ in self._lines.values())

    @property
    def total_pence(self):
        return sum(quantity * price for quantity, price in self._lines.values())
```

In `test_cart.py`, write a fixture called `cart` that returns a cart holding 2 × `"MUG"` at 800
and 1 × `"TEA"` at 350 (a total of 1950 and 3 items). Then write tests that use it to check
`item_count`, `add` and `remove`. Your tests must pass on this code and catch the bugs planted in
copies of it.
