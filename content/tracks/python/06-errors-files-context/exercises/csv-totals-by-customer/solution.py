import csv
from decimal import Decimal


def totals_by_customer(path):
    """Each customer's total of paid orders, as a Decimal, in order of first paid order."""
    totals = {}
    with open(path, newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            if row["status"] != "paid":
                continue
            customer = row["customer"]
            totals[customer] = totals.get(customer, Decimal("0")) + Decimal(row["total"])
    return totals
