def ready_to_ship(order):
    """True if every line in the order is in stock."""
    ok = True
    for line in order["lines"]:
        if not line["in_stock"]:
            ok = False
            break
    return ok


def needs_review(orders):
    """True if any order totals more than 1000."""
    found = False
    for order in orders:
        if order["total"] > 1000:
            found = True
    return found
