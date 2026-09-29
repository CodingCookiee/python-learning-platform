from datetime import date

from plp import test, hidden, raises
from solution import DateRange


@test("Lists every night of a stay, then is used up")
def _():
    nights = DateRange(date(2026, 9, 28), date(2026, 10, 1))
    assert list(nights) == [date(2026, 9, 28), date(2026, 9, 29), date(2026, 9, 30)]
    assert list(nights) == []


@test("Works with next() and is its own iterator")
def _():
    nights = DateRange(date(2026, 12, 30), date(2027, 1, 2))
    assert iter(nights) is nights
    assert next(nights) == date(2026, 12, 30)
    assert next(nights) == date(2026, 12, 31)
    assert next(nights) == date(2027, 1, 1)


@test("Keeps raising StopIteration once it's finished")
def _():
    nights = DateRange(date(2026, 9, 28), date(2026, 9, 29))
    next(nights)
    raises(StopIteration, next, nights)
    raises(StopIteration, next, nights)


@test("Steps by more than one day")
def _():
    weekly = DateRange(date(2026, 9, 1), date(2026, 9, 30), step_days=7)
    assert [d.day for d in weekly] == [1, 8, 15, 22, 29]


@hidden("An empty or backwards range produces nothing")
def _():
    assert list(DateRange(date(2026, 9, 28), date(2026, 9, 28))) == []
    assert list(DateRange(date(2026, 9, 28), date(2026, 9, 1))) == []


@hidden("Refuses a step below one day")
def _():
    raises(ValueError, DateRange, date(2026, 9, 1), date(2026, 9, 30), step_days=0)


@hidden("Two ranges are independent")
def _():
    first = DateRange(date(2026, 1, 1), date(2026, 1, 5))
    second = DateRange(date(2026, 1, 1), date(2026, 1, 5))
    next(first)
    next(first)
    assert next(second) == date(2026, 1, 1)
