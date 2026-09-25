from plp import test, hidden
from solution import swap


@test("Swaps two strings")
def _():
    assert swap("left", "right") == ("right", "left")


@test("Swaps two numbers")
def _():
    assert swap(1, 2) == (2, 1)


@test("Works when the values are equal")
def _():
    assert swap(7, 7) == (7, 7)


@hidden("Swaps values of different types")
def _():
    assert swap([1], None) == (None, [1])
