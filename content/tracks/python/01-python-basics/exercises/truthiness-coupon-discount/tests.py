from plp import test, hidden
from solution import coupon_discount


@test("Applies SAVE10 in any case")
def _():
    assert coupon_discount("save10", 80) == 10


@test("Refuses SAVE10 under 50")
def _():
    assert coupon_discount(" SAVE10 ", 49.99) == 0


@test("Gives nothing without a code")
def _():
    assert coupon_discount(None, 100) == 0


@hidden("Applies SAVE10 at exactly 50")
def _():
    assert coupon_discount("Save10", 50) == 10


@hidden("Applies VIP20 to any order")
def _():
    assert coupon_discount(" vip20", 5) == 20


@hidden("Gives nothing for a blank or unknown code")
def _():
    assert coupon_discount("", 100) == 0
    assert coupon_discount("   ", 100) == 0
    assert coupon_discount("SAVE20", 100) == 0
