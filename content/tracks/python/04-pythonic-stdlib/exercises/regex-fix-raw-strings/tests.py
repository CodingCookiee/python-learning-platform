from plp import test, hidden
from solution import find_prices


@test("Finds every price in a description")
def _():
    assert find_prices("Mug $12.50, tea $3.00, postage free") == [12.5, 3.0]


@test("Finds a price at the end of a sentence")
def _():
    assert find_prices("Today only $4.99.") == [4.99]


@test("Doesn't treat $12x50 as a price")
def _():
    assert find_prices("Code $12x50 applied") == []


@hidden("Rejects prices with three decimal places")
def _():
    assert find_prices("Rate $12.505 per unit") == []


@hidden("Returns an empty list when there are no prices")
def _():
    assert find_prices("Free delivery on everything") == []


@hidden("Handles larger prices")
def _():
    assert find_prices("Desk $1299.00 or sofa $849.95") == [1299.0, 849.95]
