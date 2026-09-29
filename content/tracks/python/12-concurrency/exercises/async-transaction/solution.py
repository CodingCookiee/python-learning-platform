from contextlib import asynccontextmanager


@asynccontextmanager
async def transaction(conn):
    """BEGIN, then COMMIT if the block succeeds, or ROLLBACK if it raises or is cancelled."""
    await conn.execute("BEGIN")
    try:
        yield conn
    except BaseException:
        await conn.execute("ROLLBACK")
        raise
    else:
        await conn.execute("COMMIT")
