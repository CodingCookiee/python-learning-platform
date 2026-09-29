from typing import Literal

OrderStatus = Literal["pending", "paid", "shipped", "cancelled"]
OrderEvent = Literal["pay", "ship", "cancel"]

TRANSITIONS: dict[tuple[OrderStatus, OrderEvent], OrderStatus] = {
    ("pending", "pay"): "paid",
    ("paid", "ship"): "shipped",
    ("pending", "cancel"): "cancelled",
    ("paid", "cancel"): "cancelled",
}


def next_status(status: OrderStatus, event: OrderEvent) -> OrderStatus:
    """The status an order moves to when an event happens to it."""
    after = TRANSITIONS.get((status, event))
    if after is None:
        raise ValueError(f"can't {event} a {status} order")
    return after
