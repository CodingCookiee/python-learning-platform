from datetime import datetime

from plp import hidden, test
from solution import cron_matches

MONDAY = datetime(2026, 3, 9, 9, 0)
TUESDAY = datetime(2026, 3, 10, 9, 0)
SUNDAY = datetime(2026, 3, 8, 8, 0)
WEDNESDAY_THE_1ST = datetime(2026, 4, 1, 9, 0)


@test("A Monday job runs on Monday, not Tuesday")
def _():
    assert cron_matches("0 9 * * 1", MONDAY) is True
    assert cron_matches("0 9 * * 1", TUESDAY) is False


@test("Sunday is 0, and 7 too")
def _():
    assert cron_matches("0 8 * * 0", SUNDAY) is True
    assert cron_matches("0 8 * * 7", SUNDAY) is True
    assert cron_matches("0 8 * * 6", SUNDAY) is False


@test("Weekdays only: 1-5")
def _():
    assert cron_matches("30 7 * * 1-5", datetime(2026, 3, 13, 7, 30)) is True    # Friday
    assert cron_matches("30 7 * * 1-5", datetime(2026, 3, 14, 7, 30)) is False   # Saturday


@test("Both day fields restricted: either one matches")
def _():
    assert cron_matches("0 9 1 * 1", WEDNESDAY_THE_1ST) is True
    assert cron_matches("0 9 1 * 1", MONDAY) is True
    assert cron_matches("0 9 1 * 1", TUESDAY) is False


@hidden("Only the day of month restricted: weekday doesn't matter")
def _():
    assert cron_matches("0 9 15 * *", datetime(2026, 3, 15, 9, 0)) is True
    assert cron_matches("0 9 15 * *", MONDAY) is False


@hidden("Minutes, hours and months still have to match")
def _():
    assert cron_matches("*/15 * * * *", datetime(2026, 3, 9, 10, 45)) is True
    assert cron_matches("*/15 * * * *", datetime(2026, 3, 9, 10, 50)) is False
    assert cron_matches("0 9 1 * 1", datetime(2026, 3, 9, 10, 0)) is False
    assert cron_matches("0 9 * 4 1", MONDAY) is False


@hidden("A stepped star counts as unrestricted")
def _():
    assert cron_matches("0 9 */2 * 1", datetime(2026, 3, 11, 9, 0)) is False   # the 11th, a Wednesday
    assert cron_matches("0 9 */2 * 1", datetime(2026, 3, 23, 9, 0)) is True    # the 23rd, a Monday
