from itertools import islice


def parse_requests(lines):
    """Yield (path, status, ms) for each well-formed line."""
    for line in lines:
        parts = line.split()
        if len(parts) != 3:
            continue
        path, status, ms = parts
        try:
            status, ms = int(status), int(ms)
        except ValueError:
            continue
        yield path, status, ms


def slow(requests, threshold_ms):
    """Yield the requests that took more than threshold_ms."""
    for request in requests:
        if request[2] > threshold_ms:
            yield request


def first_slow_paths(lines, threshold_ms, n):
    """The paths of the first n requests slower than threshold_ms."""
    paths = (path for path, _, _ in slow(parse_requests(lines), threshold_ms))
    return list(islice(paths, n))
