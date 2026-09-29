from datetime import datetime, time, timedelta


def expand_field(field, low, high):
    """The sorted values one cron field matches (this part works)."""
    values = set()
    for part in field.split(","):
        span, has_step, step_text = part.partition("/")
        step = int(step_text) if has_step else 1
        if step < 1:
            raise ValueError(f"step must be at least 1 in {part!r}")
        if span == "*":
            start, end = low, high
        elif "-" in span:
            first, last = span.split("-", 1)
            start, end = int(first), int(last)
        else:
            start = int(span)
            end = high if has_step else start
        if not low <= start <= end <= high:
            raise ValueError(f"{part!r} is outside {low}-{high} or runs backwards")
        values.update(range(start, end + 1, step))
    return sorted(values)


MAX_DAYS = 5 * 366


def next_run(expr, after):
    """The first datetime strictly after `after` when the cron expression runs."""
    minute, hour, dom, month, dow = expr.split()
    minutes = expand_field(minute, 0, 59)
    hours = expand_field(hour, 0, 23)
    days = set(expand_field(dom, 1, 31))
    months = set(expand_field(month, 1, 12))
    weekdays = {d % 7 for d in expand_field(dow, 0, 7)}
    either_day = not dom.startswith("*") and not dow.startswith("*")

    def day_matches(day):
        if day.month not in months:
            return False
        day_ok = day.day in days
        weekday_ok = day.isoweekday() % 7 in weekdays
        return (day_ok or weekday_ok) if either_day else (day_ok and weekday_ok)

    day = after.date()
    for _ in range(MAX_DAYS):
        if day_matches(day):
            for h in hours:
                for m in minutes:
                    candidate = datetime.combine(day, time(h, m), tzinfo=after.tzinfo)
                    if candidate > after:
                        return candidate
        day += timedelta(days=1)
    raise ValueError(f"{expr!r} doesn't run in the next five years")
