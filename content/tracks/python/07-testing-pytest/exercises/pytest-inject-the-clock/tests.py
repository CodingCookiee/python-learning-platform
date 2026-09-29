from datetime import date

from plp import hidden, source_avoids, test
from solution import trial_banner, trial_days_left

SIGNED_UP = date(2026, 9, 1)


@test("Counts the days left from the date it's given")
def _():
    assert trial_days_left(SIGNED_UP, today=date(2026, 9, 10)) == 5


@test("The banner uses the date it's given")
def _():
    assert trial_banner(SIGNED_UP, today=date(2026, 9, 14)) == "1 day left in your free trial"
    assert trial_banner(SIGNED_UP, today=date(2026, 10, 1)) == "Your free trial has ended"


@test("Neither function asks the clock itself")
def _():
    assert source_avoids(call="today"), (
        "Your code still calls date.today(). Use the today parameter instead, so callers (and tests) "
        "decide what day it is."
    )


@hidden("Starts at 14 and never goes below zero")
def _():
    assert trial_days_left(SIGNED_UP, today=date(2027, 1, 1)) == 0
    assert trial_days_left(SIGNED_UP, today=SIGNED_UP) == 14
    assert trial_days_left(SIGNED_UP, today=date(2026, 9, 15)) == 0


@hidden("The banner counts down in plural days")
def _():
    assert trial_banner(SIGNED_UP, today=date(2026, 9, 1)) == "14 days left in your free trial"
    assert trial_banner(SIGNED_UP, today=date(2026, 9, 13)) == "2 days left in your free trial"


@hidden("The banner and the day count agree on any date")
def _():
    for day in range(1, 31):
        today = date(2026, 9, day)
        left = trial_days_left(SIGNED_UP, today=today)
        banner = trial_banner(SIGNED_UP, today=today)
        assert (banner == "Your free trial has ended") == (left == 0), f"On {today}: {banner!r} but {left} days left"
