from plp import test, hidden
from solution import moving_average


@test("Averages each window of three")
def _():
    assert moving_average([100, 120, 110, 130, 90], 3) == [110.0, 120.0, 110.0]


@test("Reads a one-pass stream of values")
def _():
    assert moving_average(iter([100, 120, 110, 130, 90]), 3) == [110.0, 120.0, 110.0]


@test("Returns an empty list when there aren't enough values")
def _():
    assert moving_average([100, 120], 3) == []


@hidden("A window of 1 returns every value")
def _():
    assert moving_average([80, 95], 1) == [80.0, 95.0]


@hidden("Rounds to one decimal place")
def _():
    assert moving_average([1, 2, 2], 2) == [1.5, 2.0]
    assert moving_average([1, 1, 2], 3) == [1.3]
