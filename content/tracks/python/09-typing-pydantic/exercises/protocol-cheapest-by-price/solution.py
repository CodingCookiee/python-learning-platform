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


class Priced(Protocol):
    @property
    def price_cents(self) -> int: ...


def cheapest[T: Priced](items: Iterable[T]) -> T:
    """The item with the lowest price, the first one on a tie."""
    candidates = list(items)
    if not candidates:
        raise ValueError("nothing to compare")
    return min(candidates, key=lambda item: item.price_cents)


def total_price(items: Iterable[Priced]) -> int:
    """The sum of the items' prices."""
    return sum(item.price_cents for item in items)
