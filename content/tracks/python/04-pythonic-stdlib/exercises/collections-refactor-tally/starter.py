def status_counts(orders):
    """How many orders have each status, e.g. {"paid": 2, "refunded": 1}."""
    counts = {}
    for order in orders:
        status = order["status"]
        if status in counts:
            counts[status] += 1
        else:
            counts[status] = 1
    return counts


def orders_by_customer(orders):
    """Order ids grouped by customer, in input order, e.g. {"ada": ["A1", "A3"]}."""
    groups = {}
    for order in orders:
        customer = order["customer"]
        if customer not in groups:
            groups[customer] = []
        groups[customer].append(order["id"])
    return groups
