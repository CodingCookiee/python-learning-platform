import asyncio

from plp import hidden, raises, test
from solution import transaction

DEBIT = "UPDATE accounts SET balance = balance - 40 WHERE id = 7"
CREDIT = "UPDATE accounts SET balance = balance + 40 WHERE id = 9"


class Connection:
    """A fake async database connection that logs every statement."""

    def __init__(self):
        self.log = []

    async def execute(self, statement):
        await asyncio.sleep(0)
        self.log.append(statement)


@test("Commits a transfer that succeeds")
async def _():
    conn = Connection()
    async with transaction(conn) as tx:
        await tx.execute(DEBIT)
        await tx.execute(CREDIT)
    assert conn.log == ["BEGIN", DEBIT, CREDIT, "COMMIT"]


@test("Rolls back and re-raises when the block fails")
async def _():
    conn = Connection()
    with raises(ValueError, match="insufficient funds", what="a failing block inside transaction(conn)"):
        async with transaction(conn) as tx:
            await tx.execute(DEBIT)
            raise ValueError("insufficient funds")
    assert conn.log == ["BEGIN", DEBIT, "ROLLBACK"]


@test("A cancelled transfer rolls back and stays cancelled")
async def _():
    conn = Connection()

    async def slow_transfer():
        async with transaction(conn) as tx:
            await tx.execute(DEBIT)
            await asyncio.sleep(1)          # the bank's API hangs
            await tx.execute(CREDIT)

    task = asyncio.create_task(slow_transfer())
    await asyncio.sleep(0.02)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    assert task.cancelled(), "the cancellation was swallowed"
    assert conn.log == ["BEGIN", DEBIT, "ROLLBACK"]


@hidden("A timeout around the block rolls back and raises TimeoutError")
async def _():
    conn = Connection()
    with raises(TimeoutError, what="a block that overruns asyncio.timeout(0.02)"):
        async with asyncio.timeout(0.02):
            async with transaction(conn):
                await asyncio.sleep(1)
    assert conn.log == ["BEGIN", "ROLLBACK"]


@hidden("An empty block still begins and commits")
async def _():
    conn = Connection()
    async with transaction(conn) as tx:
        assert tx is conn
    assert conn.log == ["BEGIN", "COMMIT"]
