import asyncio


async def export_orders(db, orders):
    """Write every order through one connection, and always give the connection back."""
    conn = await db.connect()
    written = 0
    try:
        for order in orders:
            await conn.write(order)
            written += 1
    except asyncio.CancelledError:
        print(f"export stopped after {written} orders")
        raise
    finally:
        await conn.release()
    return written
