from collections.abc import Callable, Iterable
from dataclasses import dataclass
from typing import Any


@dataclass
class Order:
    order_id: str
    customer: str
    total_cents: int


def index_by(items: Iterable[Any], key: Callable[[Any], Any]) -> dict[Any, Any]:
    """Map key(item) to item. Two items with the same key raise ValueError."""
    index: dict[Any, Any] = {}
    for item in items:
        item_key = key(item)
        if item_key in index:
            raise ValueError(f"duplicate key: {item_key!r}")
        index[item_key] = item
    return index
