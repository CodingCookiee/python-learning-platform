import json
import os


def load_orders(text, seen=[]):
    """Parse one JSON order per line, skipping bad lines and repeated order ids."""
    orders = []
    for line in text.splitlines():
        try:
            order = json.loads(line)
        except:
            continue
        if order["id"] in seen:
            continue
        seen.append(order["id"])
        if order.get("coupon") == None:
            order["coupon"] = ""
        orders.append(order)
    return orders
