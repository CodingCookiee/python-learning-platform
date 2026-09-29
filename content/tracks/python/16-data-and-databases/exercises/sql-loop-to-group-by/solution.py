def revenue_by_region(conn):
    """Paid revenue per region in cents, biggest first, ties by region: [(region, revenue), ...]."""
    return conn.execute(
        """
        SELECT region, sum(total_cents) AS revenue
        FROM orders
        WHERE status = 'paid'
        GROUP BY region
        ORDER BY revenue DESC, region
        """
    ).fetchall()
