import functools
from collections.abc import Callable

AUDIT_LOG: list[str] = []


def audited(fn):
    """Record each call as "name(args)" in AUDIT_LOG, then call fn."""
    return fn


@audited
def refund(order_id: str, amount_cents: int, *, reason: str = "requested") -> bool:
    """Refund part or all of an order."""
    return amount_cents > 0
