import csv
import json
import tempfile
from pathlib import Path

from plp import test, hidden
from solution import orders_to_json

HEADER = ["order_id", "customer", "sku", "quantity", "unit_price"]


def convert(rows):
    """Write rows to a CSV export, convert it, and return (count, JSON text)."""
    folder = Path(tempfile.mkdtemp())
    csv_path, json_path = folder / "lines.csv", folder / "orders.json"
    with open(csv_path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(HEADER)
        writer.writerows(rows)
    count = orders_to_json(csv_path, json_path)
    assert json_path.is_file(), "orders_to_json didn't create the JSON file"
    return count, json_path.read_text(encoding="utf-8")


def orders(rows):
    count, text = convert(rows)
    return json.loads(text)


EXAMPLE = [
    ["A1001", "Ada Lovelace", "MUG-01", "2", "8.50"],
    ["A1002", "Hopper, Grace", "TEA-12", "1", "4.25"],
    ["A1001", "Ada Lovelace", "LAMP-02", "1", "24.00"],
]


@test("Groups the lines into orders")
def _():
    assert orders(EXAMPLE) == [
        {
            "order_id": "A1001",
            "customer": "Ada Lovelace",
            "lines": [
                {"sku": "MUG-01", "quantity": 2, "unit_price": "8.50"},
                {"sku": "LAMP-02", "quantity": 1, "unit_price": "24.00"},
            ],
            "total": "41.00",
        },
        {
            "order_id": "A1002",
            "customer": "Hopper, Grace",
            "lines": [{"sku": "TEA-12", "quantity": 1, "unit_price": "4.25"}],
            "total": "4.25",
        },
    ]


@test("Returns the number of orders")
def _():
    count, text = convert(EXAMPLE)
    assert count == 2


@test("Totals are exact to the cent")
def _():
    rows = [["B-1", "Linus", "PEN-05", "3", "0.10"], ["B-1", "Linus", "INK-09", "1", "0.20"]]
    assert orders(rows)[0]["total"] == "0.50"


@hidden("Writes indented JSON and keeps accented characters")
def _():
    count, text = convert([["C-1", "Chloé Dubois", "CAFÉ-250", "1", "6.90"]])
    assert "Chloé Dubois" in text, "Pass ensure_ascii=False so accented characters stay readable"
    assert text.startswith('[\n  {\n    "order_id": "C-1"'), "Write the JSON with indent=2"


@hidden("Keeps orders in first-seen order and lines in file order")
def _():
    rows = [
        ["Z-9", "Zoe", "A", "1", "1.00"],
        ["Y-8", "Yusuf", "B", "1", "2.00"],
        ["Z-9", "Zoe", "C", "2", "3.00"],
        ["Y-8", "Yusuf", "D", "1", "4.00"],
    ]
    result = orders(rows)
    assert [o["order_id"] for o in result] == ["Z-9", "Y-8"]
    assert [line["sku"] for line in result[0]["lines"]] == ["A", "C"]
    assert [o["total"] for o in result] == ["7.00", "6.00"]


@hidden("An export with no lines writes an empty list")
def _():
    count, text = convert([])
    assert count == 0
    assert json.loads(text) == []
