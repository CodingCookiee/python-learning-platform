from datetime import date, timedelta


class DateRange:
    """Dates from start up to (not including) stop, step_days apart."""

    def __init__(self, start, stop, step_days=1):
        ...
