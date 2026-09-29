def recent_orders(conn, customer, limit=3):
    """Numbers of the customer's most recent orders, newest first, without cancelled ones."""
    rows = conn.execute(
        """
        SELECT number FROM orders
        WHERE customer = ? AND status != 'cancelled'
        ORDER BY placed_on
        LIMIT ?
        """,
        (customer, limit),
    ).fetchall()
    return [row[0] for row in rows]
