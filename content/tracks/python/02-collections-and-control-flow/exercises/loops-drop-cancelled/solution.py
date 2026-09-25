def active_orders(orders):
    """Return a new list of the orders whose status isn't "cancelled". Don't change orders."""
    active = []
    for order in orders:
        order_id, status = order
        if status != "cancelled":
            active.append(order)
    return active
