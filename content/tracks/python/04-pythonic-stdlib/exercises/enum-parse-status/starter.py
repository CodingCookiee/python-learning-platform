from enum import StrEnum


class OrderStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    REFUNDED = "refunded"


def parse_status(text):
    """The OrderStatus for text like "Paid" or " shipped ", or None if it isn't one."""
    ...
