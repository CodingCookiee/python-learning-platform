def count_routes(rows, cols, closed):
    """Shortest routes from (0, 0) to (rows, cols), moving only south (rows) or east (cols),
    that avoid every junction in closed."""
    if (rows, cols) in closed:
        return 0
    if rows == 0 and cols == 0:
        return 1
    routes = 0
    if rows > 0:
        routes += count_routes(rows - 1, cols, closed)
    if cols > 0:
        routes += count_routes(rows, cols - 1, closed)
    return routes
