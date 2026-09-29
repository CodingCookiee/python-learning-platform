def average_order_value(totals: list[float]) -> float:
    """The mean of some order totals."""
    return sum(totals) / len(totals)


def total_revenue(totals: list[float]) -> float:
    """The sum of some order totals."""
    return sum(totals)


def revenue_by_region(orders: dict[str, list[float]]) -> dict[str, float]:
    """Each region's total revenue."""
    return {region: total_revenue(totals) for region, totals in orders.items()}
