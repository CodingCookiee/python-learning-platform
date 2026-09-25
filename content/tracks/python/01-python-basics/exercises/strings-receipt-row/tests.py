from decimal import Decimal

from plp import test, hidden
from solution import receipt_row


@test("Lays out the coffee beans row")
def _():
    assert receipt_row("Coffee beans", 2, 8.5) == "Coffee beans           2     17.00"


@test("Shows the line total with two decimal places")
def _():
    assert receipt_row("Oat milk", 3, 1.95) == "Oat milk               3      5.85"


@test("Every row is 34 characters long")
def _():
    row = receipt_row("Croissant", 1, 2.4)
    assert isinstance(row, str) and len(row) == 34, (
        f"receipt_row('Croissant', 1, 2.4) returned {row!r}; expected a string of 34 characters"
    )


@hidden("Cuts long names to 20 characters")
def _():
    assert receipt_row("Single-origin Ethiopian espresso", 1, 14.0) == "Single-origin Ethiop   1     14.00"


@hidden("Works with Decimal prices")
def _():
    assert receipt_row("Croissant", 10, Decimal("2.40")) == "Croissant             10     24.00"
