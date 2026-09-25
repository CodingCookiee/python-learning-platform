def active_orders(orders):
    """Return a new list of the orders whose status isn't "cancelled". Don't change orders."""
    for order in orders:
        order_id, status = order
        if status == "cancelled":
            orders.remove(order)
    return orders
