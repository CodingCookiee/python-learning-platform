from datetime import timedelta


def sessions(clicks, gap=timedelta(minutes=30)):
    """Yield a list of (timestamp, path) clicks for each session, in order."""
    ...
