def make_averager():
    """Return record(ms=None): add a response time (if given) and return the running average."""
    total = 0
    count = 0

    def record(ms=None):
        nonlocal total, count
        if ms is not None:
            total += ms
            count += 1
        if count == 0:
            return None
        return round(total / count, 1)

    return record
