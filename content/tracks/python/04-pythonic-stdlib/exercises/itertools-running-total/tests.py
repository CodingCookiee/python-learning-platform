from plp import test, hidden
from solution import running_totals


@test("Adds each day to the days before it")
def _():
    assert running_totals([120, 80, 200]) == [120, 200, 400]


@test("Returns an empty list for an empty month")
def _():
    assert running_totals([]) == []


@test("Handles refund days")
def _():
    assert running_totals([50, -20, 10]) == [50, 30, 40]


@hidden("Works on a single day and on a tuple")
def _():
    assert running_totals([75]) == [75]
    assert running_totals((1, 2, 3)) == [1, 3, 6]
