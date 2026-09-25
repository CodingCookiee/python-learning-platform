MINUTE = 60
HOUR = 60 * MINUTE
DAY = 24 * HOUR


def plural(count, unit):
    return f"{count} {unit}{'' if count == 1 else 's'} ago"


def time_ago(then, now):
    """A human description of how long before now (both aware datetimes) then was."""
    seconds = (now - then).total_seconds()
    if seconds < 0:
        raise ValueError("then is in the future")
    if seconds < MINUTE:
        return "just now"
    if seconds < HOUR:
        return plural(int(seconds // MINUTE), "minute")
    if seconds < DAY:
        return plural(int(seconds // HOUR), "hour")
    if seconds < 2 * DAY:
        return "yesterday"
    return plural(int(seconds // DAY), "day")
