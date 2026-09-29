def revenue_by_country(orders, customers):
    """Total order amount, in cents, for each customer country."""
    totals = {}
    for order in orders:
        country = "unknown"
        for customer in customers:
            if customer["id"] == order["customer_id"]:
                country = customer["country"]
                break
        totals[country] = totals.get(country, 0) + order["amount"]
    return totals
