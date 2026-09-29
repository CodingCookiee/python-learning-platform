from typing import Literal

OrderStatus = Literal["pending", "paid", "shipped", "cancelled"]


def is_order_status(value):
    """True if value is exactly one of the four order statuses."""
    ...


def parse_statuses(rows):
    """Clean each row and check it's a status, raising ValueError for the first that isn't."""
    ...


def status_label(status):
    """The dashboard label for a status."""
    ...
