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


def cron_matches(expr, when):
    """True if the datetime `when` (to the minute) is a time the cron expression runs."""
    minute, hour, dom, month, dow = expr.split()
    if not (
        when.minute in expand_field(minute, 0, 59)
        and when.hour in expand_field(hour, 0, 23)
        and when.month in expand_field(month, 1, 12)
    ):
        return False

    day_ok = when.day in expand_field(dom, 1, 31)
    # cron counts Sunday as 0 (or 7); Python's isoweekday() is Monday 1 ... Sunday 7
    weekday_ok = when.isoweekday() % 7 in {d % 7 for d in expand_field(dow, 0, 7)}

    if dom.startswith("*") or dow.startswith("*"):
        return day_ok and weekday_ok
    return day_ok or weekday_ok  # both restricted: either one is enough
