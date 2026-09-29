from typing import Literal, TypeIs, assert_never

OrderStatus = Literal["pending", "paid", "shipped", "cancelled"]
ORDER_STATUSES: tuple[OrderStatus, ...] = ("pending", "paid", "shipped", "cancelled")


def is_order_status(value: str) -> TypeIs[OrderStatus]:
    """True if value is exactly one of the four order statuses."""
    return value in ORDER_STATUSES


def parse_statuses(rows: list[str]) -> list[OrderStatus]:
    """Clean each row and check it's a status, raising ValueError for the first that isn't."""
    statuses: list[OrderStatus] = []
    for number, row in enumerate(rows, start=1):
        cleaned = row.strip().lower()
        if not is_order_status(cleaned):
            raise ValueError(f"row {number}: unknown status {cleaned!r}")
        statuses.append(cleaned)
    return statuses


def status_label(status: OrderStatus) -> str:
    """The dashboard label for a status."""
    match status:
        case "pending":
            return "Awaiting payment"
        case "paid":
            return "Paid, not shipped"
        case "shipped":
            return "On its way"
        case "cancelled":
            return "Cancelled"
        case _:
            assert_never(status)
