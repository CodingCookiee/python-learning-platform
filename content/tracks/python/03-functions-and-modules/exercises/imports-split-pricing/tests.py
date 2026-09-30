from plp import test, hidden, defined_names
import pricing
from solution import basket_total


@test("pricing.with_vat adds 20% and rounds to cents")
def _():
    assert pricing.with_vat(50) == 60.0
    assert pricing.with_vat(9.99) == 11.99


@test("pricing.bulk_discount takes 10% off 10 or more")
def _():
    assert pricing.bulk_discount(10.0, 10) == 9.0
    assert pricing.bulk_discount(9.0, 9) == 9.0


@test("Totals a basket with VAT")
def _():
    assert basket_total([("tea", 2.5, 4), ("mug", 8.0, 1)]) == 21.6


@test("Applies the bulk discount per line")
def _():
    assert basket_total([("pen", 1.0, 10)]) == 10.8


@hidden("An empty basket costs nothing")
def _():
    assert basket_total([]) == 0


@hidden("main.py uses pricing's rules instead of copying them")
def _():
    assert defined_names("function") == ["basket_total"], (
        "main.py should only define basket_total; import with_vat and bulk_discount from pricing"
    )


@hidden("A new VAT rate only needs changing in pricing.py")
def _():
    old = pricing.VAT_RATE
    pricing.VAT_RATE = 0.1
    try:
        assert basket_total([("book", 20.0, 1)]) == 22.0, "with_vat should read pricing.VAT_RATE when it runs"
    finally:
        pricing.VAT_RATE = old
