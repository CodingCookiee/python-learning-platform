from itertools import groupby


def customer_of(order):
    return order["customer"]


def revenue_by_customer(orders):
    """Total revenue per customer, e.g. {"ada": 42.5, "grace": 12.0}."""
    totals = {}
    ordered = sorted(orders, key=customer_of)
    for customer, group in groupby(ordered, key=customer_of):
        totals[customer] = sum(order["total"] for order in group)
    return totals
