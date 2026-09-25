from datetime import datetime
from zoneinfo import ZoneInfo


def local_times(meeting, zones):
    """{zone name: "Thu 14:00"} for an aware meeting datetime, in the order of zones."""
    if meeting.tzinfo is None:
        raise ValueError("meeting must be timezone-aware")
    return {name: f"{meeting.astimezone(ZoneInfo(name)):%a %H:%M}" for name in zones}
