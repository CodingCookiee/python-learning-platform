from plp import hidden, test
from solution import hours_saved


@test("40 orders a week at 6 minutes each")
def _():
    assert hours_saved(40, 6) == 17.3


@test("5 reports a week at 30 minutes each")
def _():
    assert hours_saved(5, 30) == 10.8


@test("Uses 52/12 weeks per month, not 4")
def _():
    assert hours_saved(12, 5) == 4.3


@hidden("A task that never happens saves nothing")
def _():
    assert hours_saved(0, 45) == 0


@hidden("Tiny tasks still round to one decimal")
def _():
    assert hours_saved(1, 1) == 0.1
