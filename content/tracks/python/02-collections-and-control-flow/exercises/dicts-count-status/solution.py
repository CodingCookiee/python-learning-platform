def count_by_status(orders):
    """Return {status: number of orders with that status}, in first-seen order."""
    counts = {}
    for order_id, status in orders:
        counts[status] = counts.get(status, 0) + 1
    return counts
