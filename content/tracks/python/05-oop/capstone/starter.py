"""Stock control for Millstone Coffee: products, stock movements and a low-stock report.

Run it with:  python inventory.py
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class MovementKind(Enum):
    RECEIVE = "receive"
    SALE = "sale"
    ADJUSTMENT = "adjustment"


@dataclass(frozen=True)
class Product:
    """One thing the shop stocks. Refuses a bad SKU, an empty name, a negative cost,
    a negative reorder level, or a target level that isn't above the reorder level."""

    sku: str
    name: str
    unit_cost: Decimal
    reorder_level: int
    target_level: int

    def __post_init__(self):
        ...


@dataclass(frozen=True)
class Movement:
    """One change to one product's stock: positive for stock in, negative for stock out."""

    sku: str
    change: int
    kind: MovementKind
    at: datetime
    note: str = ""

    def __post_init__(self):
        ...


# LowStockLine: a dataclass for one row of the low-stock report


class Inventory:
    def __init__(self):
        ...

    def add_product(self, product):
        """Register a product. ValueError if its SKU is already registered."""
        ...

    def product(self, sku):
        """The Product for sku. ValueError if there isn't one."""
        ...

    def products(self):
        """Every product, sorted by SKU."""
        ...

    def receive(self, sku, quantity, at, note=""):
        """Record a delivery of quantity (more than zero) and return the Movement."""
        ...

    def sell(self, sku, quantity, at, note=""):
        """Record a sale of quantity (more than zero, and no more than is in stock)."""
        ...

    def adjust(self, sku, change, at, note):
        """Record a correction after a stock count. The note is required."""
        ...

    def stock(self, sku):
        """Current stock, computed from the movements."""
        ...

    def history(self, sku):
        """The movements for sku, oldest first."""
        ...

    def valuation(self):
        """The total value of all stock, at unit cost, as a Decimal."""
        ...

    def low_stock(self):
        """A LowStockLine for every product at or below its reorder level, most urgent first."""
        ...


def format_low_stock_report(inventory, today):
    """The low-stock report as text, exactly as shown in the brief."""
    ...


# Sample data: Millstone Coffee's first week of trading

SAMPLE_PRODUCTS = [
    # sku, name, unit cost, reorder level, target level
    ("ETH-1KG", "Ethiopia Yirgacheffe, 1 kg", "14.20", 10, 40),
    ("COL-1KG", "Colombia Huila, 1 kg", "11.80", 10, 40),
    ("DEC-250", "Swiss Water decaf, 250 g", "4.10", 12, 36),
    ("V60-100", "V60 paper filters, pack of 100", "2.35", 20, 80),
    ("MUG-STN", "Stoneware mug", "5.60", 6, 24),
    ("GRD-HND", "Hand grinder", "21.00", 2, 8),
]

SAMPLE_MOVEMENTS = [
    # action, sku, quantity, when, note
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


def load_sample():
    """An Inventory filled with the sample products and movements."""
    inventory = Inventory()
    for sku, name, unit_cost, reorder_level, target_level in SAMPLE_PRODUCTS:
        inventory.add_product(Product(sku, name, Decimal(unit_cost), reorder_level, target_level))
    for action, sku, quantity, when, note in SAMPLE_MOVEMENTS:
        at = datetime.fromisoformat(when)
        if action == "receive":
            inventory.receive(sku, quantity, at, note)
        elif action == "sell":
            inventory.sell(sku, quantity, at, note)
        else:
            inventory.adjust(sku, quantity, at, note)
    return inventory


def main():
    inventory = load_sample()
    print(format_low_stock_report(inventory, date(2026, 9, 25)))
    print()

    for movement in inventory.history("MUG-STN"):
        print(f"{movement.at:%d %b %H:%M}  {movement.kind.value:<10} {movement.change:>+4}  {movement.note}")
    print()

    friday = datetime(2026, 9, 25, 10, 0)
    for attempt in (
        lambda: inventory.sell("GRD-HND", 10, friday),
        lambda: inventory.receive("CUP-PAPER", 100, friday),
        lambda: inventory.adjust("ETH-1KG", -1, friday, ""),
    ):
        try:
            attempt()
        except ValueError as error:
            print("Refused:", error)


if __name__ == "__main__":
    main()
