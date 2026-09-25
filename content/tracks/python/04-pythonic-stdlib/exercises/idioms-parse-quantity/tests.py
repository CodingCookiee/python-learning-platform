from plp import test, hidden
from solution import parse_quantity


@test("Parses whole numbers, with or without spaces")
def _():
    assert parse_quantity("3") == 3
    assert parse_quantity(" 12 ") == 12


@test("Falls back to 0 for text that isn't a number")
def _():
    assert parse_quantity("three") == 0


@test("Uses the default you pass")
def _():
    assert parse_quantity("", default=1) == 1


@hidden("Accepts negative numbers")
def _():
    assert parse_quantity("-2") == -2


@hidden("Rejects decimals and superscript digits")
def _():
    assert parse_quantity("4.0", default=-1) == -1
    assert parse_quantity("²", default=-1) == -1
