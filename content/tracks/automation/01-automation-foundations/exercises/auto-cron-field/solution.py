def expand_field(field, low, high):
    """The sorted values one cron field matches, e.g. expand_field("*/15", 0, 59) -> [0, 15, 30, 45]."""
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
