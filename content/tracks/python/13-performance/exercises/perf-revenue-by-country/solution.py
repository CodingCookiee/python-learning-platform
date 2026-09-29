def revenue_by_country(orders, customers):
    """Total order amount, in cents, for each customer country."""
    country_of = {customer["id"]: customer["country"] for customer in customers}
    totals = {}
    for order in orders:
        country = country_of.get(order["customer_id"], "unknown")
        totals[country] = totals.get(country, 0) + order["amount"]
    return totals
