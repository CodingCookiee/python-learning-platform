from dataclasses import dataclass, field
from itertools import count

_cart_numbers = count(1)


def next_cart_id():
    return f"CART-{next(_cart_numbers):04d}"


@dataclass
class Cart:
    owner: str
    items: dict = field(default_factory=dict)
    cart_id: str = field(default_factory=next_cart_id)

    def add(self, sku, quantity=1):
        self.items[sku] = self.items.get(sku, 0) + quantity
