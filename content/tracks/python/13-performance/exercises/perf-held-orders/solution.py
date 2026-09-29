def held_orders(orders, blocked_customers):
    """IDs of the orders placed by blocked customers, in the order they were placed.

    orders is a list of (order_id, customer_id) tuples.
    """
    blocked = set(blocked_customers)  # hash once, then every check is O(1)
    return [order_id for order_id, customer_id in orders if customer_id in blocked]
