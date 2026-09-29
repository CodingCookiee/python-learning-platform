from decimal import Decimal


def group_orders(items):
    """One n8n item per order (lines, item_count, total, pairedItem), sorted by order_id."""
    orders = {}
    for index, item in enumerate(items):
        line = item["json"]
        if line["qty"] == 0:
            continue  # a cancelled line
        order = orders.setdefault(line["order_id"], {
            "order_id": line["order_id"],
            "customer_email": line["customer_email"],
            "lines": [],
            "item_count": 0,
            "total": Decimal("0"),
            "indexes": [],
        })
        order["lines"].append({"sku": line["sku"], "qty": line["qty"]})
        order["item_count"] += line["qty"]
        order["total"] += Decimal(line["unit_price"]) * line["qty"]
        order["indexes"].append(index)

    grouped = []
    for order_id in sorted(orders):
        order = orders[order_id]
        indexes = order.pop("indexes")
        order["total"] = f"{order['total']:.2f}"
        grouped.append({"json": order, "pairedItem": [{"item": i} for i in indexes]})
    return grouped
