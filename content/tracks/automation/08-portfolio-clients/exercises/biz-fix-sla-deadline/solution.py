from datetime import date, datetime, time, timedelta

OPEN = time(9, 0)
CLOSE = time(17, 0)


def is_working_day(day, holidays):
    return day.weekday() < 5 and day not in holidays


def response_due(reported, hours, *, holidays=()):
    """When a response is due: `hours` working hours (09:00-17:00, Mon-Fri, not holidays) after `reported`."""
    remaining = timedelta(hours=hours)
    now = reported
    while True:
        day = now.date()
        opens, closes = datetime.combine(day, OPEN), datetime.combine(day, CLOSE)
        if is_working_day(day, holidays) and now < closes:
            now = max(now, opens)
            if remaining <= closes - now:
                return now + remaining
            remaining -= closes - now
        now = datetime.combine(day + timedelta(days=1), OPEN)
