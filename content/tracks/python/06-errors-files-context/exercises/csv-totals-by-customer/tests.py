import csv
import tempfile
from decimal import Decimal
from pathlib import Path

from plp import test, hidden
from solution import totals_by_customer

HEADER = ["order_id", "customer", "total", "status"]


def export(rows, header=HEADER):
    """Write rows to a fresh CSV file the way a spreadsheet would, and return its path."""
    path = Path(tempfile.mkdtemp()) / "orders.csv"
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(header)
        writer.writerows(rows)
    return path


@test("Totals each customer's paid orders")
def _():
    path = export([
        ["A1001", "Ada Lovelace", "12.50", "paid"],
        ["A1002", "Hopper, Grace", "8.00", "paid"],
        ["A1003", "Ada Lovelace", "30.00", "refunded"],
        ["A1004", "Ada Lovelace", "4.25", "paid"],
    ])
    assert totals_by_customer(path) == {"Ada Lovelace": Decimal("16.75"), "Hopper, Grace": Decimal("8.00")}


@test("Keeps accented names and totals exactly")
def _():
    path = export([
        ["A2001", "Chloé Dubois", "0.10", "paid"],
        ["A2002", "Chloé Dubois", "0.20", "paid"],
    ])
    assert totals_by_customer(path) == {"Chloé Dubois": Decimal("0.30")}


@test("Leaves out customers with no paid orders")
def _():
    path = export([["A3001", "Linus", "9.99", "cancelled"], ["A3002", "Margaret", "5.00", "paid"]])
    assert totals_by_customer(str(path)) == {"Margaret": Decimal("5.00")}


@hidden("Orders customers by their first paid order")
def _():
    path = export([
        ["A4001", "Zoe", "1.00", "refunded"],
        ["A4002", "Yusuf", "2.00", "paid"],
        ["A4003", "Zoe", "3.00", "paid"],
    ])
    assert list(totals_by_customer(path)) == ["Yusuf", "Zoe"]


@hidden("Finds columns by name, wherever they are")
def _():
    path = export(
        [["paid", "B-1", "7.50", "Ada Lovelace", "card"], ["paid", "B-2", "2.50", "Ada Lovelace", "cash"]],
        header=["status", "order_id", "total", "customer", "method"],
    )
    assert totals_by_customer(path) == {"Ada Lovelace": Decimal("10.00")}


@hidden("A file with only a header gives an empty dict")
def _():
    assert totals_by_customer(export([])) == {}
