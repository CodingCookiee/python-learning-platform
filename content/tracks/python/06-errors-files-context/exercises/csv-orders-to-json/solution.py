import csv
import json
from decimal import Decimal


def orders_to_json(csv_path, json_path):
    """Group the CSV's order lines into orders, write them to json_path, and return how many."""
    orders = {}
    with open(csv_path, newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            order = orders.get(row["order_id"])
            if order is None:
                order = {"order_id": row["order_id"], "customer": row["customer"], "lines": [], "total": Decimal("0")}
                orders[row["order_id"]] = order
            quantity = int(row["quantity"])
            order["lines"].append({"sku": row["sku"], "quantity": quantity, "unit_price": row["unit_price"]})
            order["total"] += quantity * Decimal(row["unit_price"])

    for order in orders.values():
        order["total"] = f"{order['total']:.2f}"
    with open(json_path, "w", encoding="utf-8") as file:
        json.dump(list(orders.values()), file, indent=2, ensure_ascii=False)
    return len(orders)
