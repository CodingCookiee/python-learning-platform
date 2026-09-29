def top_customers(conn, start, end, min_revenue_cents=0, limit=5):
    """[(customer name, paid orders, revenue in cents), ...] for paid orders placed in [start, end),
    customers with at least min_revenue_cents, biggest first, ties by name, at most limit rows."""
    ...
