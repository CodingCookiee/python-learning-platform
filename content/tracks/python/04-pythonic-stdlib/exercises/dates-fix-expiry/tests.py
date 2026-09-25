from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from plp import test, hidden
from solution import is_expired

EXPIRES = "2026-10-01T09:00:00+02:00"


@test("Expired exactly at the expiry moment")
def _():
    assert is_expired(EXPIRES, datetime(2026, 10, 1, 7, 0, tzinfo=timezone.utc)) is True


@test("Not expired a minute before")
def _():
    assert is_expired(EXPIRES, datetime(2026, 10, 1, 6, 59, tzinfo=timezone.utc)) is False


@test("Works when now is in another time zone")
def _():
    new_york = ZoneInfo("America/New_York")
    assert is_expired(EXPIRES, datetime(2026, 10, 1, 3, 0, tzinfo=new_york)) is True
    assert is_expired(EXPIRES, datetime(2026, 10, 1, 2, 59, tzinfo=new_york)) is False


@hidden("Reads expiry times that end in Z")
def _():
    assert is_expired("2026-10-01T07:00:00Z", datetime(2026, 10, 1, 7, 0, tzinfo=timezone.utc)) is True
    assert is_expired("2026-10-01T07:00:00Z", datetime(2026, 10, 1, 6, 0, tzinfo=timezone.utc)) is False


@hidden("Long-expired subscriptions are expired")
def _():
    assert is_expired("2025-01-01T00:00:00+00:00", datetime(2026, 9, 25, tzinfo=timezone.utc)) is True
