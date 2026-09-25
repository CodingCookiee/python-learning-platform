def orders_by_customer(orders):
    """Group (order_id, customer) pairs into {customer: [order_id, ...]}."""
    groups = {}
    for order_id, customer in orders:
        groups[customer] = [order_id]
    return groups
