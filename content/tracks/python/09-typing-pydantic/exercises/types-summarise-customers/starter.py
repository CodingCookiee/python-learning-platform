from collections.abc import Iterable
from typing import TypedDict


class OrderRow(TypedDict):
    order_id: str
    customer: str
    total_cents: int
    placed_on: str


# CustomerSummary: orders (int), spent_cents (int), last_order (str)


def summarise(rows):
    """Orders, spend and latest order date per customer, biggest spender first."""
    ...
