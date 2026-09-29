import csv
from decimal import Decimal


def total_by_status(path):
    """Total the amount column per status: {"paid": Decimal("25.00"), ...}."""
    totals = {}
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            status = row["status"]
            totals[status] = totals.get(status, 0) + float(row["amount"])
    return totals
