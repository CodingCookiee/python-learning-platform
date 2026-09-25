from datetime import datetime, timedelta, timezone

from plp import test, hidden
from solution import parse_log_time


@test("Parses a UTC log timestamp into an aware datetime")
def _():
    stamp = parse_log_time("25/Sep/2026:14:03:07 +0000")
    assert stamp == datetime(2026, 9, 25, 14, 3, 7, tzinfo=timezone.utc)
    assert stamp.tzinfo is not None, "The result should be aware: include %z in the format"


@test("Keeps the offset")
def _():
    assert parse_log_time("25/Sep/2026:16:03:07 +0200").utcoffset() == timedelta(hours=2)


@test("Two offsets naming the same moment compare equal")
def _():
    assert parse_log_time("25/Sep/2026:16:03:07 +0200") == parse_log_time("25/Sep/2026:14:03:07 +0000")


@hidden("Parses other months and a negative offset")
def _():
    stamp = parse_log_time("01/Mar/2026:23:59:59 -0500")
    assert stamp == datetime(2026, 3, 2, 4, 59, 59, tzinfo=timezone.utc)


@hidden("Raises ValueError for text in another format")
def _():
    try:
        parse_log_time("2026-09-25 14:03:07")
    except ValueError:
        return
    raise AssertionError("parse_log_time should raise ValueError for an ISO timestamp")
