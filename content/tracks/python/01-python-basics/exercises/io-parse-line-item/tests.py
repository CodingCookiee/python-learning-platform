from decimal import Decimal

from plp import test, hidden, run_program
from solution import parse_item


@test("Parses the coffee beans line")
def _():
    assert parse_item("Coffee beans, 2, 8.50") == ("Coffee beans", 2, Decimal("8.50"))


@test("Returns an int quantity and a Decimal price")
def _():
    parsed = parse_item("Oat milk, 3, 1.95")
    assert parsed is not None, "parse_item returned None; return the three parts"
    name, quantity, unit_price = parsed
    assert isinstance(quantity, int), f"The quantity came back as {quantity!r}; convert it with int()"
    assert isinstance(unit_price, Decimal), f"The price came back as {unit_price!r}; convert it with Decimal()"


@test("Prints the line total")
def _():
    assert run_program(stdin=["Coffee beans, 2, 8.50"]).lines == ["2 x Coffee beans = 17.00"]


@hidden("Copes with missing and extra spaces")
def _():
    assert parse_item("Oat milk,3,1.95") == ("Oat milk", 3, Decimal("1.95"))
    assert parse_item("  Croissant ,  1 , 2.40  ") == ("Croissant", 1, Decimal("2.40"))


@hidden("Prints the total for a larger quantity")
def _():
    assert run_program(stdin=["Espresso, 12, 1.15"]).lines == ["12 x Espresso = 13.80"]
