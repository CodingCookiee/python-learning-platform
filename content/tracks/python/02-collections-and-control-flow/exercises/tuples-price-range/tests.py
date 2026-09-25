from plp import test, hidden
from solution import price_range


@test("Returns the lowest and highest price")
def _():
    assert price_range([12.0, 4.99, 24.5, 8.75]) == (4.99, 24.5)


@test("Returns a tuple")
def _():
    result = price_range([3, 1, 2])
    assert type(result) is tuple, f"price_range returned a {type(result).__name__}, expected a tuple"


@test("Uses the same price twice when there's only one")
def _():
    assert price_range([9.99]) == (9.99, 9.99)


@hidden("Works on a tuple of prices")
def _():
    assert price_range((5, 50, 0.5)) == (0.5, 50)
