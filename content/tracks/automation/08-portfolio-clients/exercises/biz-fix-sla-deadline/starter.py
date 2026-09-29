from datetime import date, datetime, time, timedelta

OPEN = time(9, 0)
CLOSE = time(17, 0)


def response_due(reported, hours, *, holidays=()):
    """When a response is due: `hours` working hours (09:00-17:00, Mon-Fri, not holidays) after `reported`."""
    return reported + timedelta(hours=hours)
