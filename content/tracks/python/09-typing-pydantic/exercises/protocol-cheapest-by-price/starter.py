from collections.abc import Iterable
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class Product:
    name: str
    price_cents: int


class ShippingOption:
    def __init__(self, label: str, base_cents: int, surcharge_cents: int) -> None:
        self.label = label
        self.base_cents = base_cents
        self.surcharge_cents = surcharge_cents

    @property
    def price_cents(self) -> int:
        return self.base_cents + self.surcharge_cents


@dataclass
class GiftCard:
    code: str
    price_cents: int


# Priced: anything with a price_cents you can read


def cheapest(items):
    """The item with the lowest price, the first one on a tie."""
    ...


def total_price(items):
    """The sum of the items' prices."""
    ...
