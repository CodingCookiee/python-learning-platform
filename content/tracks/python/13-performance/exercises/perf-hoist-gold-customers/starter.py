def gold_order_ids(orders, customers):
    """IDs of the orders placed by gold-tier customers, in order."""
    result = []
    for order in orders:
        gold = {customer["id"] for customer in customers if customer["tier"] == "gold"}
        if order["customer_id"] in gold:
            result.append(order["id"])
    return result
