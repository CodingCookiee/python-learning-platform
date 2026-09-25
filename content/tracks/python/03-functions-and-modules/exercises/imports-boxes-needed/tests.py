from plp import test, hidden, source_uses
from solution import boxes_needed


@test("Rounds a part-filled box up")
def _():
    assert boxes_needed(47, 12) == 4


@test("An exact fit needs no extra box")
def _():
    assert boxes_needed(48, 12) == 4


@test("No items need no boxes")
def _():
    assert boxes_needed(0, 12) == 0


@hidden("One item needs one box")
def _():
    assert boxes_needed(1, 50) == 1


@hidden("Returns a whole number")
def _():
    result = boxes_needed(10, 4)
    assert type(result) is int, f"boxes_needed should return an int, not a {type(result).__name__}"
    assert result == 3


@hidden("Uses math.ceil")
def _():
    assert source_uses(call="ceil"), "Import math and use math.ceil"
