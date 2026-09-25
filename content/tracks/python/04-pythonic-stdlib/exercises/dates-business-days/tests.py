from datetime import date

from plp import test, hidden
from solution import add_business_days


@test("Friday plus one working day is Monday")
def _():
    assert add_business_days(date(2026, 9, 25), 1) == date(2026, 9, 28)


@test("Skips a weekend in the middle")
def _():
    assert add_business_days(date(2026, 9, 23), 5) == date(2026, 9, 30)
    assert add_business_days(date(2026, 9, 21), 3) == date(2026, 9, 24)


@test("Skips holidays")
def _():
    holidays = {date(2026, 12, 25), date(2026, 12, 28)}
    assert add_business_days(date(2026, 12, 24), 1, holidays=holidays) == date(2026, 12, 29)


@hidden("Zero days returns the start date")
def _():
    assert add_business_days(date(2026, 9, 26), 0) == date(2026, 9, 26)


@hidden("Starting on a Saturday, one working day is Monday")
def _():
    assert add_business_days(date(2026, 9, 26), 1) == date(2026, 9, 28)


@hidden("Twenty working days is four weeks")
def _():
    assert add_business_days(date(2026, 9, 21), 20) == date(2026, 10, 19)
