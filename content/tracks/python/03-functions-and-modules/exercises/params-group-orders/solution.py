def group_by_customer(orders, groups=None):
    """Return {customer: [order ids]} for a list of (customer, order_id) pairs.

    groups should be optional: when given, add the orders into it and return it.
    """
    if groups is None:
        groups = {}
    for customer, order_id in orders:
        groups.setdefault(customer, []).append(order_id)
    return groups
