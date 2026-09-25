def customer_changes(last_month, this_month):
    """Return (returning, new, lapsed) customer sets."""
    before = set(last_month)
    now = set(this_month)
    return before & now, now - before, before - now
