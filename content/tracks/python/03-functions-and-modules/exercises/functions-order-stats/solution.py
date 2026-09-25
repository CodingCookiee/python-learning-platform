def order_stats(amounts):
    """Return (count, total, average) for a list of order amounts.

    total and average are rounded to cents. An empty list gives (0, 0.0, None).
    """
    if not amounts:
        return 0, 0.0, None
    count = len(amounts)
    total = sum(amounts)
    return count, round(total, 2), round(total / count, 2)
