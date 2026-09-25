from datetime import datetime, timedelta, timezone

from plp import test, hidden
from solution import time_ago

NOW = datetime(2026, 9, 25, 14, 0, tzinfo=timezone.utc)


def ago(**delta):
    return time_ago(NOW - timedelta(**delta), NOW)


@test("Minutes and yesterday")
def _():
    assert time_ago(datetime(2026, 9, 25, 13, 55, tzinfo=timezone.utc), NOW) == "5 minutes ago"
    assert time_ago(datetime(2026, 9, 24, 8, 0, tzinfo=timezone.utc), NOW) == "yesterday"


@test("Under a minute is just now")
def _():
    assert ago(seconds=59) == "just now"
    assert ago(seconds=0) == "just now"


@test("Uses singular and plural units, rounded down")
def _():
    assert ago(minutes=1) == "1 minute ago"
    assert ago(minutes=90) == "1 hour ago"
    assert ago(hours=5, minutes=59) == "5 hours ago"
    assert ago(days=3, hours=5) == "3 days ago"


@hidden("Switches unit exactly on the boundaries")
def _():
    assert ago(minutes=59, seconds=59) == "59 minutes ago"
    assert ago(hours=24) == "yesterday"
    assert ago(hours=48) == "2 days ago"


@hidden("Works across time zones")
def _():
    karachi = timezone(timedelta(hours=5))
    then = datetime(2026, 9, 25, 18, 30, tzinfo=karachi)   # 13:30 UTC
    assert time_ago(then, NOW) == "30 minutes ago"


@hidden("Raises ValueError for a time in the future")
def _():
    try:
        time_ago(NOW + timedelta(minutes=1), NOW)
    except ValueError:
        return
    raise AssertionError("time_ago should raise ValueError when then is after now")
