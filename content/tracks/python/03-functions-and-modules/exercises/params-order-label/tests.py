from plp import test, hidden
from solution import order_label


@test("Uses the default prefix and width")
def _():
    assert order_label(1042) == "ORD-01042"


@test("Takes a prefix by position")
def _():
    assert order_label(7, "INV") == "INV-00007"


@test("Takes a width by keyword")
def _():
    assert order_label(1042, width=7) == "ORD-0001042"


@hidden("Accepts every argument by keyword, in any order")
def _():
    assert order_label(width=3, prefix="RET", order_id=3) == "RET-003"


@hidden("Never cuts a long number short")
def _():
    assert order_label(123456) == "ORD-123456"
