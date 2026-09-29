from datetime import timedelta


def sessions(clicks, gap=timedelta(minutes=30)):
    """Yield a list of (timestamp, path) clicks for each session, in order."""
    current = []
    for click in clicks:
        if current and click[0] - current[-1][0] > gap:
            yield current
            current = []
        current.append(click)
    if current:
        yield current
