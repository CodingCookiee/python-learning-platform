import pandas as pd

from plp import test, hidden
from solution import load_orders

EXPORT = """order_id,sku,placed_on,quantity,unit_price
1001,00417,2026-09-01,2,12.50
1002,00990,2026-09-02,1,75.00
1003,12345,2026-09-08,4,3.99
"""


@test("Keeps SKUs as text and parses the dates")
def _():
    orders = load_orders(EXPORT)
    assert orders["sku"].tolist() == ["00417", "00990", "12345"]
    assert orders["placed_on"].dt.day.tolist() == [1, 2, 8]


@test("placed_on is a datetime column")
def _():
    assert pd.api.types.is_datetime64_any_dtype(load_orders(EXPORT)["placed_on"]), "Parse placed_on as dates"


@test("Numbers are still numbers")
def _():
    orders = load_orders(EXPORT)
    assert orders["order_id"].tolist() == [1001, 1002, 1003]
    assert (orders["quantity"] * orders["unit_price"]).round(2).tolist() == [25.0, 75.0, 15.96]


@hidden("Works with a single row and keeps the columns in order")
def _():
    orders = load_orders("order_id,sku,placed_on,quantity,unit_price\n7,0001,2026-12-31,1,1.00\n")
    assert list(orders.columns) == ["order_id", "sku", "placed_on", "quantity", "unit_price"]
    assert orders.loc[0, "sku"] == "0001"
    assert orders.loc[0, "placed_on"] == pd.Timestamp("2026-12-31")
