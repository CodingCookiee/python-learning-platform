def ready_to_ship(order):
    """True if every line in the order is in stock."""
    return all(line["in_stock"] for line in order["lines"])


def needs_review(orders):
    """True if any order totals more than 1000."""
    return any(order["total"] > 1000 for order in orders)
