from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from plp import test, hidden
from solution import local_times

ZONES = ["Europe/London", "America/New_York", "Asia/Karachi"]


@test("Shows the meeting in three time zones")
def _():
    meeting = datetime(2026, 10, 15, 13, 0, tzinfo=timezone.utc)
    assert local_times(meeting, ZONES) == {
        "Europe/London": "Thu 14:00",
        "America/New_York": "Thu 09:00",
        "Asia/Karachi": "Thu 18:00",
    }


@test("Follows daylight saving time")
def _():
    meeting = datetime(2026, 11, 5, 13, 0, tzinfo=timezone.utc)
    result = local_times(meeting, ["Europe/London", "America/New_York"])
    assert result == {"Europe/London": "Thu 13:00", "America/New_York": "Thu 08:00"}


@test("Shows the next day where it's already tomorrow")
def _():
    meeting = datetime(2026, 10, 15, 20, 0, tzinfo=timezone.utc)
    assert local_times(meeting, ["Asia/Tokyo"]) == {"Asia/Tokyo": "Fri 05:00"}


@hidden("Accepts a meeting given in a local zone")
def _():
    meeting = datetime(2026, 10, 15, 9, 0, tzinfo=ZoneInfo("America/New_York"))
    assert local_times(meeting, ["Europe/London"]) == {"Europe/London": "Thu 14:00"}


@hidden("Keeps the zones in the order given")
def _():
    meeting = datetime(2026, 10, 15, 13, 0, tzinfo=timezone.utc)
    zones = ["Asia/Karachi", "Europe/London", "America/New_York"]
    assert list(local_times(meeting, zones)) == zones


@hidden("Raises ValueError for a naive meeting")
def _():
    try:
        local_times(datetime(2026, 10, 15, 13, 0), ZONES)
    except ValueError:
        return
    raise AssertionError("local_times should raise ValueError when meeting has no time zone")
