from datetime import datetime
from itertools import groupby


def _hour_and_status(lines):
    for line in lines:
        parts = line.split()
        if len(parts) != 3:
            continue
        timestamp, _, status = parts
        hour = datetime.fromisoformat(timestamp).replace(minute=0, second=0, microsecond=0)
        yield hour, int(status)


def hourly_error_rates(lines):
    """Yield (hour, requests, errors, rate) for each hour of a time-ordered log."""
    for hour, group in groupby(_hour_and_status(lines), key=lambda item: item[0]):
        requests = errors = 0
        for _, status in group:
            requests += 1
            errors += status >= 500
        yield hour, requests, errors, round(errors / requests, 3)
