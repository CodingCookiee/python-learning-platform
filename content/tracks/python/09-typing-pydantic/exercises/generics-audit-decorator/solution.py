import functools
from collections.abc import Callable

AUDIT_LOG: list[str] = []


def audited[**P, R](fn: Callable[P, R]) -> Callable[P, R]:
    """Record each call as "name(args)" in AUDIT_LOG, then call fn."""

    @functools.wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        parts = [repr(arg) for arg in args] + [f"{name}={value!r}" for name, value in kwargs.items()]
        AUDIT_LOG.append(f"{fn.__name__}({', '.join(parts)})")
        return fn(*args, **kwargs)

    return wrapper


@audited
def refund(order_id: str, amount_cents: int, *, reason: str = "requested") -> bool:
    """Refund part or all of an order."""
    return amount_cents > 0
