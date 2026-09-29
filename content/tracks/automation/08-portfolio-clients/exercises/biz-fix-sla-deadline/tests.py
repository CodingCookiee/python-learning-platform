from datetime import date, datetime

from plp import hidden, test
from solution import response_due


@test("Friday 16:00 plus 4 working hours is Monday 12:00")
def _():
    assert response_due(datetime(2026, 10, 9, 16, 0), 4) == datetime(2026, 10, 12, 12, 0)


@test("Within one working day, it's plain addition")
def _():
    assert response_due(datetime(2026, 10, 6, 10, 0), 4) == datetime(2026, 10, 6, 14, 0)


@test("A weekend report starts the clock on Monday at 09:00")
def _():
    assert response_due(datetime(2026, 10, 10, 11, 0), 4) == datetime(2026, 10, 12, 13, 0)


@test("Evenings and early mornings don't count")
def _():
    assert response_due(datetime(2026, 10, 7, 18, 30), 2) == datetime(2026, 10, 8, 11, 0)
    assert response_due(datetime(2026, 10, 8, 7, 15), 1) == datetime(2026, 10, 8, 10, 0)


@hidden("A deadline can land exactly at closing time")
def _():
    assert response_due(datetime(2026, 10, 6, 13, 0), 4) == datetime(2026, 10, 6, 17, 0)


@hidden("Twelve hours spans two working days")
def _():
    assert response_due(datetime(2026, 10, 5, 9, 0), 12) == datetime(2026, 10, 6, 13, 0)


@hidden("Holidays are skipped like weekends")
def _():
    assert response_due(datetime(2026, 10, 9, 16, 0), 4, holidays={date(2026, 10, 12)}) == datetime(2026, 10, 13, 12, 0)
