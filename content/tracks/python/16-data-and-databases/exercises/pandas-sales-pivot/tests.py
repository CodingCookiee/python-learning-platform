import pandas as pd

from plp import test, hidden, raises
from solution import monthly_revenue


def orders():
    return pd.DataFrame({
        "order_id": [1, 2, 3, 4, 5],
        "sku": ["DESK-OAK", "CHAIR-ERG", "DESK-OAK", "LAMP-01", "CHAIR-ERG"],
        "placed_on": pd.to_datetime(["2026-08-14", "2026-09-02", "2026-09-03", "2026-09-10", "2026-09-28"]),
        "quantity": [1, 2, 1, 3, 1],
        "unit_price": [300.0, 45.0, 300.0, 16.5, 0.0],
    })


def products():
    return pd.DataFrame({
        "sku": ["DESK-OAK", "CHAIR-ERG", "LAMP-01", "SHELF-3"],
        "name": ["Oak desk", "Ergonomic chair", "Desk lamp", "Three-tier shelf"],
        "category": ["Furniture", "Furniture", "Lighting", "Furniture"],
    })


@test("Pivots revenue by category and month")
def _():
    assert monthly_revenue(orders(), products()).to_dict() == {
        "2026-08": {"Furniture": 300.0, "Lighting": 0.0},
        "2026-09": {"Furniture": 390.0, "Lighting": 49.5},
    }


@test("Months and categories are in order")
def _():
    table = monthly_revenue(orders(), products())
    assert list(table.columns) == ["2026-08", "2026-09"]
    assert list(table.index) == ["Furniture", "Lighting"]


@test("An unknown SKU raises ValueError naming it")
def _():
    bad = orders()
    bad.loc[1, "sku"] = "SOFA-2"
    raises(ValueError, monthly_revenue, bad, products(), match="SOFA-2")


@hidden("A SKU listed twice in products raises ValueError")
def _():
    doubled = pd.concat([products(), products().iloc[[0]]], ignore_index=True)
    raises(ValueError, monthly_revenue, orders(), doubled)


@hidden("Rounds to 2 decimal places")
def _():
    few = pd.DataFrame({
        "order_id": [1, 2, 3],
        "sku": ["LAMP-01"] * 3,
        "placed_on": pd.to_datetime(["2026-10-01"] * 3),
        "quantity": [1, 1, 1],
        "unit_price": [0.1, 0.2, 16.333],
    })
    assert monthly_revenue(few, products()).to_dict() == {"2026-10": {"Lighting": 16.63}}
