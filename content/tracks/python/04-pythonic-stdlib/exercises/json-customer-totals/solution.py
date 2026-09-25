import json
from collections import defaultdict


def customer_totals(payload):
    """JSON text of {customer: total of paid orders}, keys sorted."""
    totals = defaultdict(float)
    for order in json.loads(payload)["orders"]:
        if order["status"] == "paid":
            totals[order["customer"]] += order["total"]
    return json.dumps({customer: round(total, 2) for customer, total in totals.items()}, sort_keys=True)
