"""Acceptance tests for the inventory system, run by GitHub Actions in your repository.

They run `python inventory.py` and compare its output with the sample run, then import
Product, Movement, MovementKind and Inventory from inventory.py and check each rule.
"""

import dataclasses
import importlib
import subprocess
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import pytest

PROGRAM = Path("inventory.py")
FRIDAY = datetime(2026, 9, 25, 10, 0)
TODAY = date(2026, 9, 25)

SAMPLE_OUTPUT = """\
Low stock report, 25 Sep 2026

SKU       Product                      Stock  Reorder  Order
------------------------------------------------------------
V60-100   V60 paper filters, pack...       0       20     80  OUT
ETH-1KG   Ethiopia Yirgacheffe, 1 kg       6       10     34
MUG-STN   Stoneware mug                    5        6     19
DEC-250   Swiss Water decaf, 250 g        12       12     24
------------------------------------------------------------
4 products to reorder
Stock value: 435.20

22 Sep 09:05  receive     +12  PO-1182
22 Sep 17:30  sale         -3  Shop, Monday
23 Sep 08:15  adjustment   -2  Two broken in the stockroom
24 Sep 17:30  sale         -2  Shop, Wednesday

Refused: GRD-HND: only 4 in stock, can't remove 10
Refused: CUP-PAPER: unknown SKU
Refused: ETH-1KG: an adjustment needs a note"""

PRODUCTS = [
    ("ETH-1KG", "Ethiopia Yirgacheffe, 1 kg", "14.20", 10, 40),
    ("COL-1KG", "Colombia Huila, 1 kg", "11.80", 10, 40),
    ("DEC-250", "Swiss Water decaf, 250 g", "4.10", 12, 36),
    ("V60-100", "V60 paper filters, pack of 100", "2.35", 20, 80),
    ("MUG-STN", "Stoneware mug", "5.60", 6, 24),
    ("GRD-HND", "Hand grinder", "21.00", 2, 8),
]

MOVEMENTS = [
    ("receive", "ETH-1KG", 30, "2026-09-22T09:00", "PO-1181"),
    ("receive", "COL-1KG", 30, "2026-09-22T09:00", "PO-1181"),
    ("receive", "DEC-250", 24, "2026-09-22T09:00", "PO-1181"),
    ("receive", "V60-100", 60, "2026-09-22T09:05", "PO-1182"),
    ("receive", "MUG-STN", 12, "2026-09-22T09:05", "PO-1182"),
    ("receive", "GRD-HND", 5, "2026-09-22T09:05", "PO-1182"),
    ("sell", "ETH-1KG", 9, "2026-09-22T17:30", "Shop, Monday"),
    ("sell", "COL-1KG", 6, "2026-09-22T17:30", "Shop, Monday"),
    ("sell", "V60-100", 25, "2026-09-22T17:30", "Shop, Monday"),
    ("sell", "MUG-STN", 3, "2026-09-22T17:30", "Shop, Monday"),
    ("adjust", "MUG-STN", -2, "2026-09-23T08:15", "Two broken in the stockroom"),
    ("sell", "ETH-1KG", 15, "2026-09-24T11:02", "Wholesale, Kiln Cafe"),
    ("sell", "DEC-250", 12, "2026-09-24T17:30", "Shop, Wednesday"),
    ("sell", "COL-1KG", 8, "2026-09-24T17:30", "Shop, Wednesday"),
    ("sell", "V60-100", 35, "2026-09-24T17:30", "Shop, Wednesday"),
    ("sell", "MUG-STN", 2, "2026-09-24T17:30", "Shop, Wednesday"),
    ("sell", "GRD-HND", 1, "2026-09-24T17:30", "Shop, Wednesday"),
]


def inv():
    """The learner's inventory module."""
    assert PROGRAM.exists(), "inventory.py should be at the top of your repository"
    return importlib.import_module("inventory")


def product(sku="ETH-1KG", name="Ethiopia", cost="14.20", reorder=10, target=40):
    return inv().Product(sku, name, Decimal(cost), reorder, target)


def sample():
    """An Inventory holding the brief's sample products and movements."""
    module = inv()
    inventory = module.Inventory()
    for sku, name, cost, reorder, target in PRODUCTS:
        inventory.add_product(module.Product(sku, name, Decimal(cost), reorder, target))
    for action, sku, quantity, when, note in MOVEMENTS:
        at = datetime.fromisoformat(when)
        if action == "receive":
            inventory.receive(sku, quantity, at, note)
        elif action == "sell":
            inventory.sell(sku, quantity, at, note)
        else:
            inventory.adjust(sku, quantity, at, note)
    return inventory


def rows(lines):
    """LowStockLine objects as (sku, name, stock, reorder_level, suggested_order) tuples."""
    return [(x.sku, x.name, x.stock, x.reorder_level, x.suggested_order) for x in lines]


def test_python_inventory_py_prints_the_sample_run():
    assert PROGRAM.exists(), "inventory.py should be at the top of your repository"
    result = subprocess.run([sys.executable, str(PROGRAM)], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, f"python inventory.py crashed:\n{result.stderr[-1500:]}"
    got = [line.rstrip() for line in result.stdout.rstrip().splitlines()]
    assert got == SAMPLE_OUTPUT.splitlines()


def test_products_are_validated():
    module = inv()
    for sku in ["ETH-1KG", "MUG", "A1-B2-C3"]:
        product(sku=sku)
    for sku in ["eth-1kg", "ETH--1KG", "-ETH", "ETH-", "ETH 1KG", ""]:
        with pytest.raises(ValueError):
            product(sku=sku)
            pytest.fail(f"Product({sku!r}, ...) should raise ValueError: that isn't a valid SKU")
    bad = {
        "an empty name": dict(name="   "),
        "a negative cost": dict(cost="-0.01"),
        "a negative reorder level": dict(reorder=-1, target=5),
        "a target equal to the reorder level": dict(reorder=5, target=5),
        "a target below the reorder level": dict(reorder=5, target=4),
    }
    for problem, kwargs in bad.items():
        with pytest.raises(ValueError):
            product(**kwargs)
            pytest.fail(f"A Product with {problem} should raise ValueError")
    assert product(cost="0", reorder=0, target=1).unit_cost == 0, "A cost of zero and a reorder level of 0 are fine"
    assert dataclasses.is_dataclass(module.Product)


def test_products_and_movements_are_frozen_and_hashable():
    module = inv()
    item = product()
    with pytest.raises(dataclasses.FrozenInstanceError):
        item.unit_cost = Decimal("1.00")
    assert {item: 1}[product()] == 1, "Equal products should be equal and hashable (usable as dict keys)"
    movement = module.Movement("ETH-1KG", 5, module.MovementKind.RECEIVE, FRIDAY, "PO-1")
    assert movement.note == "PO-1" and module.Movement("ETH-1KG", 5, module.MovementKind.RECEIVE, FRIDAY).note == ""
    with pytest.raises(dataclasses.FrozenInstanceError):
        movement.change = 6
    assert len({movement, module.Movement("ETH-1KG", 5, module.MovementKind.RECEIVE, FRIDAY, "PO-1")}) == 1


def test_movements_are_validated():
    module = inv()
    kind = module.MovementKind
    bad = {
        "a change of zero": ("ETH-1KG", 0, kind.ADJUSTMENT, "count"),
        "a RECEIVE that removes stock": ("ETH-1KG", -1, kind.RECEIVE, ""),
        "a SALE that adds stock": ("ETH-1KG", 1, kind.SALE, ""),
        "an ADJUSTMENT with no note": ("ETH-1KG", -1, kind.ADJUSTMENT, ""),
    }
    for problem, (sku, change, movement_kind, note) in bad.items():
        with pytest.raises(ValueError):
            module.Movement(sku, change, movement_kind, FRIDAY, note)
            pytest.fail(f"A Movement with {problem} should raise ValueError")
    module.Movement("ETH-1KG", 3, kind.ADJUSTMENT, FRIDAY, "Found a box")
    module.Movement("ETH-1KG", -3, kind.SALE, FRIDAY)


def test_stock_comes_from_the_movements_and_history_explains_it():
    module = inv()
    inventory = module.Inventory()
    inventory.add_product(product())
    assert inventory.stock("ETH-1KG") == 0, "A product with no movements has a stock of 0"
    received = inventory.receive("ETH-1KG", 10, datetime(2026, 9, 22, 9, 0), "PO-1")
    sold = inventory.sell("ETH-1KG", 4, datetime(2026, 9, 23, 9, 0))
    adjusted = inventory.adjust("ETH-1KG", 2, datetime(2026, 9, 24, 9, 0), "Found two")
    assert (received.change, received.kind) == (10, module.MovementKind.RECEIVE)
    assert (sold.change, sold.kind) == (-4, module.MovementKind.SALE), "sell stores a negative change"
    assert (adjusted.change, adjusted.kind, adjusted.note) == (2, module.MovementKind.ADJUSTMENT, "Found two")
    assert inventory.stock("ETH-1KG") == 8
    assert list(inventory.history("ETH-1KG")) == [received, sold, adjusted]
    assert sample().stock("MUG-STN") == 5


def test_refusals_raise_value_error_naming_the_sku():
    inventory = sample()
    attempts = {
        "a duplicate product": lambda: inventory.add_product(product("ETH-1KG", "Duplicate", "1", 1, 2)),
        "receiving an unknown SKU": lambda: inventory.receive("CUP-PAPER", 100, FRIDAY),
        "selling an unknown SKU": lambda: inventory.sell("CUP-PAPER", 1, FRIDAY),
        "adjusting an unknown SKU": lambda: inventory.adjust("CUP-PAPER", 1, FRIDAY, "count"),
        "the stock of an unknown SKU": lambda: inventory.stock("CUP-PAPER"),
        "looking up an unknown SKU": lambda: inventory.product("CUP-PAPER"),
        "receiving 0": lambda: inventory.receive("ETH-1KG", 0, FRIDAY),
        "selling -1": lambda: inventory.sell("ETH-1KG", -1, FRIDAY),
        "an adjustment without a note": lambda: inventory.adjust("ETH-1KG", -1, FRIDAY, ""),
        "selling more than is in stock": lambda: inventory.sell("GRD-HND", 10, FRIDAY),
        "adjusting below zero": lambda: inventory.adjust("MUG-STN", -6, FRIDAY, "Lost"),
    }
    for problem, attempt in attempts.items():
        with pytest.raises(ValueError) as caught:
            attempt()
            pytest.fail(f"{problem} should raise ValueError")
        sku = next(s for s in ["CUP-PAPER", "ETH-1KG", "GRD-HND", "MUG-STN"] if s in attempt.__code__.co_consts)
        assert str(caught.value).startswith(sku), (
            f"The message for {problem} should start with the SKU, {sku}: got {str(caught.value)!r}"
        )
    with pytest.raises(ValueError) as caught:
        inventory.sell("GRD-HND", 10, FRIDAY)
    assert str(caught.value) == "GRD-HND: only 4 in stock, can't remove 10"


def test_a_refused_operation_changes_nothing():
    inventory = sample()
    before = {sku: (inventory.stock(sku), len(list(inventory.history(sku)))) for sku, *_ in PRODUCTS}
    inventory.sell("ETH-1KG", 6, FRIDAY)
    for attempt in [
        lambda: inventory.sell("ETH-1KG", 1, FRIDAY),
        lambda: inventory.adjust("MUG-STN", -6, FRIDAY, "Lost"),
        lambda: inventory.adjust("MUG-STN", 1, FRIDAY, ""),
        lambda: inventory.receive("MUG-STN", 0, FRIDAY),
        lambda: inventory.add_product(product(name="Duplicate", cost="1", reorder=1, target=2)),
    ]:
        with pytest.raises(ValueError):
            attempt()
    assert inventory.stock("ETH-1KG") == 0
    assert len(list(inventory.history("ETH-1KG"))) == before["ETH-1KG"][1] + 1, "A refused sale must not be recorded"
    assert (inventory.stock("MUG-STN"), len(list(inventory.history("MUG-STN")))) == before["MUG-STN"], (
        "Refused operations on MUG-STN changed its stock or its history"
    )
    assert inventory.product("ETH-1KG").name == "Ethiopia Yirgacheffe, 1 kg", "A duplicate must not replace the product"
    assert len(list(inventory.products())) == 6


def test_products_are_sorted_by_sku_and_valuation_is_exact():
    inventory = sample()
    assert [p.sku for p in inventory.products()] == ["COL-1KG", "DEC-250", "ETH-1KG", "GRD-HND", "MUG-STN", "V60-100"]
    value = inventory.valuation()
    assert isinstance(value, Decimal), f"valuation() should return a Decimal, not {type(value).__name__}"
    assert value == Decimal("435.20")


def test_low_stock_lists_the_most_urgent_first():
    assert rows(sample().low_stock()) == [
        ("V60-100", "V60 paper filters, pack of 100", 0, 20, 80),
        ("ETH-1KG", "Ethiopia Yirgacheffe, 1 kg", 6, 10, 34),
        ("MUG-STN", "Stoneware mug", 5, 6, 19),
        ("DEC-250", "Swiss Water decaf, 250 g", 12, 12, 24),
    ]
    inventory = sample()
    for sku in ["COL-1KG", "GRD-HND", "ETH-1KG"]:
        inventory.sell(sku, inventory.stock(sku), FRIDAY)
    assert [line.sku for line in inventory.low_stock()] == [
        "V60-100", "COL-1KG", "ETH-1KG", "GRD-HND", "MUG-STN", "DEC-250",
    ], "Out-of-stock products come first, then furthest below the reorder level, then by SKU"
    assert dataclasses.is_dataclass(inventory.low_stock()[0]), "low_stock() should return LowStockLine dataclasses"


def test_report_after_restocking():
    module = inv()
    inventory = sample()
    for sku, *_ in PRODUCTS:
        inventory.receive(sku, 20, FRIDAY)
    report = module.format_low_stock_report(inventory, TODAY).splitlines()
    assert [line.rstrip() for line in report[3:]] == [
        "------------------------------------------------------------",
        "V60-100   V60 paper filters, pack...      20       20     60",
        "------------------------------------------------------------",
        "1 product to reorder",
        "Stock value: 1,616.20",
    ]
    for sku, *_ in PRODUCTS:
        inventory.receive(sku, 10, FRIDAY)
    report = module.format_low_stock_report(inventory, TODAY)
    assert report.splitlines() == [
        "Low stock report, 25 Sep 2026",
        "",
        "Every product is above its reorder level.",
        "Stock value: 2,206.70",
    ]


def test_report_for_a_new_product_with_no_movements():
    module = inv()
    inventory = module.Inventory()
    inventory.add_product(module.Product("GRD-HND", "Hand grinder", Decimal("21.00"), 2, 8))
    report = [line.rstrip() for line in module.format_low_stock_report(inventory, TODAY).splitlines()]
    assert report == [
        "Low stock report, 25 Sep 2026",
        "",
        "SKU       Product                      Stock  Reorder  Order",
        "------------------------------------------------------------",
        "GRD-HND   Hand grinder                     0        2      8  OUT",
        "------------------------------------------------------------",
        "1 product to reorder",
        "Stock value: 0.00",
    ]


def test_importing_it_prints_nothing():
    assert PROGRAM.exists(), "inventory.py should be at the top of your repository"
    result = subprocess.run(
        [sys.executable, "-c", "import inventory"], input="", capture_output=True, text=True, timeout=20
    )
    assert result.returncode == 0, f"Importing inventory.py failed:\n{result.stderr[-800:]}"
    assert result.stdout == "", f'Importing inventory.py printed something: keep main() under if __name__ == "__main__":'
