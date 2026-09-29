def gold_order_ids(orders, customers):
    """IDs of the orders placed by gold-tier customers, in order."""
    gold = {customer["id"] for customer in customers if customer["tier"] == "gold"}
    return [order["id"] for order in orders if order["customer_id"] in gold]
