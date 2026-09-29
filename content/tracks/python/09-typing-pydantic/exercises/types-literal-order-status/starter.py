from typing import Literal

# OrderStatus: "pending", "paid", "shipped" or "cancelled"
# OrderEvent: "pay", "ship" or "cancel"


def next_status(status, event):
    """The status an order moves to when an event happens to it."""
    ...
