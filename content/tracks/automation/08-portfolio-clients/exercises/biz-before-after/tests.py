from decimal import Decimal

from plp import hidden, test
from solution import before_after


@test("Reminder calls fell by 94%")
def _():
    assert before_after("Reminder calls", 90, 5, "min a day") == "Reminder calls: 90 → 5 min a day (-94%)"


@test("Increases get a plus sign, rounded half up")
def _():
    # (31 - 8) / 8 = 287.5%
    assert before_after("Reviews collected", 8, 31, "a month") == "Reviews collected: 8 → 31 a month (+288%)"


@test("Decimals are shown as they are")
def _():
    assert before_after("Report building", Decimal("2.5"), Decimal("0.5"), "hours a week") == (
        "Report building: 2.5 → 0.5 hours a week (-80%)")


@test("No percentage when there was nothing before")
def _():
    assert before_after("Same-day quotes", 0, 14, "a week") == "Same-day quotes: 0 → 14 a week"


@hidden("No change is +0%")
def _():
    assert before_after("Refund errors", 3, 3, "a month") == "Refund errors: 3 → 3 a month (+0%)"


@hidden("A drop to zero is -100%")
def _():
    assert before_after("Missed enquiries", 12, 0, "a week") == "Missed enquiries: 12 → 0 a week (-100%)"
