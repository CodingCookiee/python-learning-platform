from functools import cache


def routes(rows, cols, blocked=()):
    """Routes from (0, 0) to (rows, cols), moving down or right, avoiding blocked cells."""
    return _routes(rows, cols, frozenset(blocked))


@cache
def _routes(rows, cols, blocked):
    if rows < 0 or cols < 0 or (rows, cols) in blocked:
        return 0
    if rows == 0 and cols == 0:
        return 1
    return _routes(rows - 1, cols, blocked) + _routes(rows, cols - 1, blocked)
