from collections.abc import Callable, Iterable
from dataclasses import dataclass


@dataclass
class Order:
    order_id: str
    customer: str
    total_cents: int


def index_by[T, K](items: Iterable[T], key: Callable[[T], K]) -> dict[K, T]:
    """Map key(item) to item. Two items with the same key raise ValueError."""
    index: dict[K, T] = {}
    for item in items:
        item_key = key(item)
        if item_key in index:
            raise ValueError(f"duplicate key: {item_key!r}")
        index[item_key] = item
    return index
