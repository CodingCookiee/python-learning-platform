def backoff(base, factor=2, cap=60):
    """Yield base, base * factor, base * factor ** 2, ... never more than cap, forever."""
    delay = base
    while True:
        yield min(delay, cap)
        delay *= factor
