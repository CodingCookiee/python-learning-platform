def read_orders(lines):
    """Parse "day,sku,amount" lines into order dicts, one at a time."""
    for line in lines:
        day, sku, amount = line.strip().split(",")
        yield {"day": day, "sku": sku, "amount": int(amount)}


def daily_totals(lines):
    """Total amount per day, in cents."""
    totals = {}
    for order in read_orders(lines):
        totals[order["day"]] = totals.get(order["day"], 0) + order["amount"]
    return totals
