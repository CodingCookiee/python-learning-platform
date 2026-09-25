from decimal import Decimal

from plp import test, hidden
from solution import price_with_tax


@test("Adds 20% tax to 19.99")
def _():
    assert price_with_tax("19.99", "0.20") == Decimal("23.99")


@test("Returns a Decimal")
def _():
    result = price_with_tax("19.99", "0.20")
    assert isinstance(result, Decimal), (
        f"price_with_tax returned {result!r}, a {type(result).__name__}; return a Decimal"
    )


@test("Gets the cent right where floats don't")
def _():
    assert price_with_tax("1.90", "0.05") == Decimal("2.00")


@test("Rounds half a cent up, not to even")
def _():
    assert price_with_tax("2.50", "0.05") == Decimal("2.63")


@hidden("Always shows two decimal places")
def _():
    assert str(price_with_tax("100", "0")) == "100.00"


@hidden("Is correct on more prices")
def _():
    assert price_with_tax("12.50", "0.05") == Decimal("13.13")
    assert price_with_tax("4.10", "0.05") == Decimal("4.31")
    assert price_with_tax("0.00", "0.20") == Decimal("0.00")
