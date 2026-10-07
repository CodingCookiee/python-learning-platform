from plp import test, hidden
from solution import split_bill


@test("Splits 60 between 4 people")
def _():
    assert split_bill(60, 4) == 15.0


@test("Rounds each share to 2 decimal places")
def _():
    assert split_bill(100, 3) == 33.33


@test("Splits a bill with decimals")
def _():
    assert split_bill(25.5, 2) == 12.75


@hidden("One person pays the whole bill")
def _():
    assert split_bill(42.5, 1) == 42.5


@hidden("Rounds 6.666... up to 6.67, and tidies long decimals")
def _():
    assert split_bill(20, 3) == 6.67
    assert split_bill(87.45, 5) == 17.49
