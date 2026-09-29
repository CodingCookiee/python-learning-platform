from contextlib import asynccontextmanager


async def transaction(conn):
    """BEGIN, then COMMIT if the block succeeds, or ROLLBACK if it raises or is cancelled."""
    ...
