from itertools import islice


def parse_requests(lines):
    """Yield (path, status, ms) for each well-formed line."""
    ...


def slow(requests, threshold_ms):
    """Yield the requests that took more than threshold_ms."""
    ...


def first_slow_paths(lines, threshold_ms, n):
    """The paths of the first n requests slower than threshold_ms."""
    ...
