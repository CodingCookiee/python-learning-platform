"""Stock control for Millstone Coffee: products, stock movements and a low-stock report.

Run it with:  python inventory.py
"""

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

SKU_PATTERN = re.compile(r"[A-Z0-9]+(?:-[A-Z0-9]+)*")
REPORT_RULE = "-" * 60
NAME_WIDTH = 28
NAME_CUT = 24


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
        if not isinstance(self.sku, str) or not SKU_PATTERN.fullmatch(self.sku):
            raise ValueError(f"{self.sku}: a SKU is capital letters and digits joined by single hyphens")
        if not self.name.strip():
            raise ValueError(f"{self.sku}: the name can't be empty")
        if not isinstance(self.unit_cost, Decimal) or not self.unit_cost.is_finite() or self.unit_cost < 0:
            raise ValueError(f"{self.sku}: the unit cost must be a Decimal of zero or more")
        if self.reorder_level < 0:
            raise ValueError(f"{self.sku}: the reorder level can't be negative")
        if self.target_level <= self.reorder_level:
            raise ValueError(f"{self.sku}: the target level must be above the reorder level")


@dataclass(frozen=True)
class Movement:
    """One change to one product's stock: positive for stock in, negative for stock out."""

    sku: str
    change: int
    kind: MovementKind
    at: datetime
    note: str = ""

    def __post_init__(self):
        if self.change == 0:
            raise ValueError(f"{self.sku}: a movement can't change stock by zero")
        if self.kind is MovementKind.RECEIVE and self.change < 0:
            raise ValueError(f"{self.sku}: a delivery must add stock")
        if self.kind is MovementKind.SALE and self.change > 0:
            raise ValueError(f"{self.sku}: a sale must remove stock")
        if self.kind is MovementKind.ADJUSTMENT and not self.note.strip():
            raise ValueError(f"{self.sku}: an adjustment needs a note")


@dataclass(order=True)
class LowStockLine:
    """One row of the low-stock report. Sorts most urgent first."""

    sort_key: tuple = field(init=False, repr=False)
    sku: str
    name: str
    stock: int
    reorder_level: int
    suggested_order: int

    def __post_init__(self):
        self.sort_key = (self.stock > 0, self.stock - self.reorder_level, self.sku)


class Inventory:
    """The products Millstone stocks and the append-only log of every stock movement."""

    def __init__(self):
        self._products = {}
        self._movements = []

    def add_product(self, product):
        """Register a product. ValueError if its SKU is already registered."""
        if product.sku in self._products:
            raise ValueError(f"{product.sku}: already registered")
        self._products[product.sku] = product

    def product(self, sku):
        """The Product for sku. ValueError if there isn't one."""
        try:
            return self._products[sku]
        except KeyError:
            raise ValueError(f"{sku}: unknown SKU") from None

    def products(self):
        """Every product, sorted by SKU."""
        return [self._products[sku] for sku in sorted(self._products)]

    def receive(self, sku, quantity, at, note=""):
        """Record a delivery of quantity (more than zero) and return the Movement."""
        self._check_quantity(sku, quantity)
        return self._record(Movement(sku, quantity, MovementKind.RECEIVE, at, note))

    def sell(self, sku, quantity, at, note=""):
        """Record a sale of quantity (more than zero, and no more than is in stock)."""
        self._check_quantity(sku, quantity)
        return self._record(Movement(sku, -quantity, MovementKind.SALE, at, note))

    def adjust(self, sku, change, at, note):
        """Record a correction after a stock count. The note is required."""
        self.product(sku)
        return self._record(Movement(sku, change, MovementKind.ADJUSTMENT, at, note))

    def stock(self, sku):
        """Current stock, computed from the movements."""
        self.product(sku)
        return sum(movement.change for movement in self._movements if movement.sku == sku)

    def history(self, sku):
        """The movements for sku, oldest first."""
        self.product(sku)
        return sorted((m for m in self._movements if m.sku == sku), key=lambda m: m.at)

    def valuation(self):
        """The total value of all stock, at unit cost, as a Decimal."""
        return sum((p.unit_cost * self.stock(p.sku) for p in self._products.values()), Decimal("0"))

    def low_stock(self):
        """A LowStockLine for every product at or below its reorder level, most urgent first."""
        lines = []
        for product in self.products():
            stock = self.stock(product.sku)
            if stock <= product.reorder_level:
                lines.append(
                    LowStockLine(product.sku, product.name, stock, product.reorder_level, product.target_level - stock)
                )
        return sorted(lines)

    def _check_quantity(self, sku, quantity):
        self.product(sku)
        if quantity <= 0:
            raise ValueError(f"{sku}: quantity must be more than zero")

    def _record(self, movement):
        """Check a movement against the current stock, then append it to the log."""
        self.product(movement.sku)
        stock = self.stock(movement.sku)
        if stock + movement.change < 0:
            raise ValueError(f"{movement.sku}: only {stock} in stock, can't remove {-movement.change}")
        self._movements.append(movement)
        return movement


def short_name(name):
    """The name, cut to fit the report's product column."""
    if len(name) > NAME_WIDTH - 1:
        return name[:NAME_CUT].rstrip() + "..."
    return name


def format_low_stock_report(inventory, today):
    """The low-stock report as text, exactly as shown in the brief."""
    lines = [f"Low stock report, {today:%d %b %Y}", ""]
    low = inventory.low_stock()
    if low:
        lines += [f"{'SKU':<10}{'Product':<28}{'Stock':>6}{'Reorder':>9}{'Order':>7}", REPORT_RULE]
        for line in low:
            row = f"{line.sku:<10}{short_name(line.name):<28}{line.stock:>6}{line.reorder_level:>9}{line.suggested_order:>7}"
            lines.append(row + ("  OUT" if line.stock == 0 else ""))
        lines += [REPORT_RULE, f"{len(low)} product{'s' if len(low) != 1 else ''} to reorder"]
    else:
        lines.append("Every product is above its reorder level.")
    lines.append(f"Stock value: {inventory.valuation():,.2f}")
    return "\n".join(lines)


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
