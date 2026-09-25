from datetime import date, timedelta

SATURDAY = 5


def add_business_days(start, days, holidays=()):
    """The date that is days working days (Mon-Fri, not a holiday) after start."""
    current = start
    remaining = days
    while remaining > 0:
        current += timedelta(days=1)
        if current.weekday() < SATURDAY and current not in holidays:
            remaining -= 1
    return current
