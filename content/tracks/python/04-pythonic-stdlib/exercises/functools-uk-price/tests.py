from functools import partial

from plp import test, hidden
from solution import uk_price, de_price, price_with_tax


@test("uk_price adds 20% and de_price adds 19%")
def _():
    assert uk_price(10) == 12.0
    assert de_price(100) == 119.0


@test("Both are built with functools.partial")
def _():
    assert isinstance(uk_price, partial), "Define uk_price with partial(...)"
    assert isinstance(de_price, partial), "Define de_price with partial(...)"


@hidden("Both wrap price_with_tax")
def _():
    assert uk_price.func is price_with_tax
    assert de_price.func is price_with_tax


@hidden("Rounds to cents")
def _():
    assert uk_price(19.99) == 23.99
    assert de_price(4.2) == 5.0
