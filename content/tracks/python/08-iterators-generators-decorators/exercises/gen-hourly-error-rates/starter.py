from datetime import datetime
from itertools import groupby


def hourly_error_rates(lines):
    """Yield (hour, requests, errors, rate) for each hour of a time-ordered log."""
    ...
