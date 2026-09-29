QUERY = "SELECT id, email FROM customers WHERE active ORDER BY id"


async def export_customers(db, sink):
    """Stream every active customer into the sink; return how many were written."""
    count = 0
    with db.connect() as conn:
        for row in conn.stream(QUERY):
            sink.write(row)
            count += 1
    return count
