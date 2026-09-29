def read_orders(lines):
    """Parse "day,sku,amount" lines into order dicts."""
    orders = []
    for line in lines:
        day, sku, amount = line.strip().split(",")
        orders.append({"day": day, "sku": sku, "amount": int(amount)})
    return orders


def daily_totals(lines):
    """Total amount per day, in cents."""
    totals = {}
    for order in read_orders(lines):
        totals[order["day"]] = totals.get(order["day"], 0) + order["amount"]
    return totals
