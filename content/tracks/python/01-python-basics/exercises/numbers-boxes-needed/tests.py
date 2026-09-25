from plp import test, hidden
from solution import boxes_needed


@test("Adds a box for the leftover items")
def _():
    assert boxes_needed(10, 4) == 3


@test("Needs no extra box when the items divide evenly")
def _():
    assert boxes_needed(8, 4) == 2


@test("Returns a whole number of boxes")
def _():
    result = boxes_needed(10, 4)
    assert isinstance(result, int), f"boxes_needed(10, 4) returned {result!r}, a {type(result).__name__}; return an int"


@hidden("Uses one box for a single item")
def _():
    assert boxes_needed(1, 6) == 1


@hidden("Needs no boxes for an empty order")
def _():
    assert boxes_needed(0, 4) == 0


@hidden("Handles a large order")
def _():
    assert boxes_needed(1_000_001, 1_000) == 1_001
