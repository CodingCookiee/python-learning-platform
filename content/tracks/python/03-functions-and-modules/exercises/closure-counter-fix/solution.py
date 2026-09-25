def make_counter(prefix):
    """Return a function that gives out ticket ids: prefix-001, prefix-002, and so on."""
    count = 0

    def next_id():
        nonlocal count
        count += 1
        return f"{prefix}-{count:03d}"

    return next_id
