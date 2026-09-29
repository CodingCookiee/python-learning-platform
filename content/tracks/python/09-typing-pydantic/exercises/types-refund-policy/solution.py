from typing import Final

RETURN_WINDOW_DAYS: Final = 30


def refund_cents(paid_cents: int, days_since_delivery: int, *, damaged: bool = False) -> int:
    """How much of a payment to refund, in cents."""
    if days_since_delivery < 0:
        raise ValueError("days_since_delivery can't be negative")
    if days_since_delivery <= RETURN_WINDOW_DAYS:
        return paid_cents
    if damaged:
        return paid_cents // 2
    return 0
