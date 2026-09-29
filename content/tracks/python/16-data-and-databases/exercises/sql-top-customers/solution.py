def top_customers(conn, start, end, min_revenue_cents=0, limit=5):
    """[(customer name, paid orders, revenue in cents), ...] for paid orders placed in [start, end),
    customers with at least min_revenue_cents, biggest first, ties by name, at most limit rows."""
    return conn.execute(
        """
        SELECT c.name,
               count(DISTINCT o.id) AS orders,
               sum(l.quantity * l.unit_price_cents) AS revenue
        FROM customers AS c
        JOIN orders AS o ON o.customer_id = c.id
        JOIN order_lines AS l ON l.order_id = o.id
        WHERE o.status = 'paid' AND o.placed_on >= ? AND o.placed_on < ?
        GROUP BY c.id
        HAVING sum(l.quantity * l.unit_price_cents) >= ?
        ORDER BY revenue DESC, c.name
        LIMIT ?
        """,
        (start, end, min_revenue_cents, limit),
    ).fetchall()
