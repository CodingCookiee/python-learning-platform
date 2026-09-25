from collections import Counter, defaultdict


def status_counts(orders):
    """How many orders have each status, e.g. {"paid": 2, "refunded": 1}."""
    return Counter(order["status"] for order in orders)


def orders_by_customer(orders):
    """Order ids grouped by customer, in input order, e.g. {"ada": ["A1", "A3"]}."""
    groups = defaultdict(list)
    for order in orders:
        groups[order["customer"]].append(order["id"])
    return dict(groups)
