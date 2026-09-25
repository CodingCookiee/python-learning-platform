from plp import test, hidden
from solution import top_three


@test("Returns the three highest prices, highest first")
def _():
    assert top_three([4.99, 24.5, 12.0, 8.75, 19.99]) == [24.5, 19.99, 12.0]


@test("Leaves the caller's list in its original order")
def _():
    prices = [4.99, 24.5, 12.0, 8.75, 19.99]
    top_three(prices)
    assert prices == [4.99, 24.5, 12.0, 8.75, 19.99]


@test("Returns every price when there are fewer than three")
def _():
    assert top_three([3.5, 9.0]) == [9.0, 3.5]


@hidden("Keeps duplicate prices")
def _():
    assert top_three([5, 1, 5, 5, 2]) == [5, 5, 5]


@hidden("Returns an empty list for no prices")
def _():
    assert top_three([]) == []
