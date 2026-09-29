from functools import cache


def count_routes(rows, cols, closed):
    """Shortest routes from (0, 0) to (rows, cols), moving only south (rows) or east (cols),
    that avoid every junction in closed."""

    @cache  # a fresh cache for each call, so one call's closures never leak into another
    def routes_to(row, col):
        if (row, col) in closed:
            return 0
        if row == 0 and col == 0:
            return 1
        routes = 0
        if row > 0:
            routes += routes_to(row - 1, col)
        if col > 0:
            routes += routes_to(row, col - 1)
        return routes

    return routes_to(rows, cols)
