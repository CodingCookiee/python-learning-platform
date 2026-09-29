from datetime import UTC, datetime

from plp import hidden, raises, test
from solution import next_run


@test("The next Monday at 09:00")
def _():
    assert next_run("0 9 * * 1", datetime(2026, 3, 10, 12, 0)) == datetime(2026, 3, 16, 9, 0)


@test("Every 15 minutes: the next quarter hour")
def _():
    assert next_run("*/15 * * * *", datetime(2026, 3, 9, 10, 7, 30)) == datetime(2026, 3, 9, 10, 15)


@test("Strictly after: a job due right now runs next time")
def _():
    assert next_run("0 9 * * *", datetime(2026, 3, 9, 9, 0)) == datetime(2026, 3, 10, 9, 0)


@test("Weekday mornings skip the weekend")
def _():
    assert next_run("30 7 * * 1-5", datetime(2026, 3, 13, 8, 0)) == datetime(2026, 3, 16, 7, 30)


@hidden("Both day fields restricted: the earlier of the two", timeout=3)
def _():
    assert next_run("0 9 1 * 1", datetime(2026, 3, 10, 12, 0)) == datetime(2026, 3, 16, 9, 0)
    assert next_run("0 9 1 * 1", datetime(2026, 3, 30, 12, 0)) == datetime(2026, 4, 1, 9, 0)


@hidden("Rolls over months and years, and keeps the time zone")
def _():
    assert next_run("0 0 1 * *", datetime(2026, 12, 15, 18, 0, tzinfo=UTC)) == datetime(2027, 1, 1, 0, 0, tzinfo=UTC)


@hidden("Waits for a leap day, quickly")
def _():
    assert next_run("0 0 29 2 *", datetime(2026, 3, 1)) == datetime(2028, 2, 29, 0, 0)


@hidden("An expression that never runs raises ValueError")
def _():
    raises(ValueError, next_run, "0 0 30 2 *", datetime(2026, 3, 1))
