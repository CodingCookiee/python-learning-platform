def rotate_left(items, n):
    """Return a new list: items rotated left by n places (n may be large or negative)."""
    if not items:
        return []
    n = n % len(items)
    return items[n:] + items[:n]
