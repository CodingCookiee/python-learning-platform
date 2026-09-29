from decimal import Decimal

from plp import hidden, test
from solution import runs_per_month


@test("30 per working day is 650 a month")
def _():
    assert runs_per_month(30, "working day") == Decimal("650.0")


@test("A month has 52 / 12 weeks")
def _():
    assert runs_per_month(3, "week") == Decimal("13.0")


@test("A month has 365 / 12 days")
def _():
    assert runs_per_month(2, "day") == Decimal("60.8")


@test("Months and years were already right")
def _():
    assert runs_per_month(12, "month") == Decimal("12.0")
    assert runs_per_month(6, "year") == Decimal("0.5")


@hidden("Returns a Decimal rounded to one place")
def _():
    result = runs_per_month(1, "week")
    assert isinstance(result, Decimal)
    assert result == Decimal("4.3")
    assert str(result) == "4.3"
