from plp import hidden, raises, test
from solution import expand_field


@test("Every 15 minutes")
def _():
    assert expand_field("*/15", 0, 59) == [0, 15, 30, 45]


@test("Ranges, stepped ranges and lists")
def _():
    assert expand_field("1-5", 0, 7) == [1, 2, 3, 4, 5]
    assert expand_field("9-17/2", 0, 23) == [9, 11, 13, 15, 17]
    assert expand_field("0,30,15", 0, 59) == [0, 15, 30]


@test("A star covers the whole field")
def _():
    assert expand_field("*", 1, 12) == list(range(1, 13))


@test("Rejects values outside the field")
def _():
    raises(ValueError, expand_field, "60", 0, 59)
    raises(ValueError, expand_field, "0", 1, 31)


@hidden("Rejects backwards ranges, zero steps and words")
def _():
    raises(ValueError, expand_field, "17-9", 0, 23)
    raises(ValueError, expand_field, "*/0", 0, 59)
    raises(ValueError, expand_field, "noon", 0, 23)


@hidden("A single number with a step runs to the top of the field")
def _():
    assert expand_field("5/15", 0, 59) == [5, 20, 35, 50]


@hidden("Overlapping parts don't repeat values")
def _():
    assert expand_field("1-3,2,3-4", 1, 31) == [1, 2, 3, 4]
