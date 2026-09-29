from collections.abc import Iterable, Mapping, Sequence


def average_order_value(totals: Sequence[float]) -> float:
    """The mean of some order totals."""
    return sum(totals) / len(totals)


def total_revenue(totals: Iterable[float]) -> float:
    """The sum of some order totals."""
    return sum(totals)


def revenue_by_region(orders: Mapping[str, Iterable[float]]) -> dict[str, float]:
    """Each region's total revenue."""
    return {region: total_revenue(totals) for region, totals in orders.items()}
