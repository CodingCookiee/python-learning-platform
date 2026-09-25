from plp import test, hidden
from solution import line_total


@test("Multiplies quantity by unit price")
def _():
    assert line_total(3, 4.5) == 13.5


@test("Rounds away float noise")
def _():
    assert line_total(3, 0.1) == 0.3


@test("Rounds to cents")
def _():
    assert line_total(7, 1.333) == 9.33


@hidden("A zero quantity costs nothing")
def _():
    assert line_total(0, 19.99) == 0


@hidden("Handles large orders")
def _():
    assert line_total(1200, 0.35) == 420.0
