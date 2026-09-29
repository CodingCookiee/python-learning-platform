import asyncio

from plp import hidden, raises, raises_async, test
from solution import export_orders


class Connection:
    """A fake pooled database connection. Each write takes 10 ms."""

    def __init__(self):
        self.rows = []
        self.released = False

    async def write(self, order):
        await asyncio.sleep(0.01)
        if order.startswith("BAD"):
            raise ValueError(f"{order}: missing customer id")
        self.rows.append(order)

    async def release(self):
        await asyncio.sleep(0)
        self.released = True


class Database:
    def __init__(self):
        self.conn = Connection()

    async def connect(self):
        await asyncio.sleep(0)
        return self.conn


ORDERS = [f"A-{n}" for n in range(1000, 1020)]


@test("A time limit that passes raises TimeoutError")
async def _():
    db = Database()
    with raises(TimeoutError, what="export_orders(db, ORDERS) under asyncio.timeout(0.055)"):
        async with asyncio.timeout(0.055):
            await export_orders(db, ORDERS)
    assert len(db.conn.rows) < len(ORDERS)


@test("The connection is released when the time limit passes")
async def _():
    db = Database()
    try:
        async with asyncio.timeout(0.055):
            await export_orders(db, ORDERS)
    except TimeoutError:
        pass
    assert db.conn.released, "the connection was never released"


@test("A finished export returns the count and releases the connection")
async def _():
    db = Database()
    assert await export_orders(db, ORDERS[:3]) == 3
    assert db.conn.released


@test("A failed write propagates, and the connection is still released")
async def _():
    db = Database()
    await raises_async(ValueError, export_orders, db, ["A-1", "BAD-2", "A-3"], match="missing customer id")
    assert db.conn.released, "the connection was never released"


@hidden("Cancelling the export's task leaves it cancelled")
async def _():
    db = Database()
    task = asyncio.create_task(export_orders(db, ORDERS))
    await asyncio.sleep(0.035)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    assert task.cancelled(), "the task swallowed its cancellation and returned normally"
    assert db.conn.released
