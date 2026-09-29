from decimal import Decimal

from plp import test, hidden, raises
from solution import check_refund


@test("Allows a partial refund")
def _():
    assert check_refund(15, 40) == 15


@test("Refuses a refund of zero")
def _():
    raises(ValueError, check_refund, 0, 40, match="^refund must be more than zero$")


@test("Refuses a refund of more than was paid")
def _():
    raises(ValueError, check_refund, 55, 40, match=r"^refund of 55 is more than the 40 paid$")


@hidden("Allows a full refund")
def _():
    assert check_refund(40, 40) == 40


@hidden("Refuses a negative refund and works with Decimal amounts")
def _():
    raises(ValueError, check_refund, -5, 40, match="more than zero")
    assert check_refund(Decimal("12.50"), Decimal("12.50")) == Decimal("12.50")
    raises(ValueError, check_refund, Decimal("12.51"), Decimal("12.50"), match=r"12\.51 is more than the 12\.50 paid")
