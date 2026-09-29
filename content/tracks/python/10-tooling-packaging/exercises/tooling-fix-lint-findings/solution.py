import json


def load_orders(text):
    """Parse one JSON order per line, skipping bad lines and repeated order ids."""
    seen = set()
    orders = []
    for line in text.splitlines():
        try:
            order = json.loads(line)
        except json.JSONDecodeError:
            continue
        if order["id"] in seen:
            continue
        seen.add(order["id"])
        if order.get("coupon") is None:
            order["coupon"] = ""
        orders.append(order)
    return orders
