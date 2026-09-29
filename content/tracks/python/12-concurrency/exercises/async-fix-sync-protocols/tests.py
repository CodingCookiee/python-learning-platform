import asyncio
from contextlib import asynccontextmanager

from plp import hidden, test
from solution import export_customers

CUSTOMERS = [(1, "ada@example.com"), (2, "grace@example.com"), (4, "linus@example.com")]


class Connection:
    def __init__(self, rows):
        self.rows = rows
        self.queries = []

    async def stream(self, query):
        self.queries.append(query)
        for row in self.rows:
            await asyncio.sleep(0)
            yield row


class Database:
    """A fake async driver: connect() is an async context manager."""

    def __init__(self, rows):
        self.rows = rows
        self.open = 0
        self.released = 0

    @asynccontextmanager
    async def connect(self):
        await asyncio.sleep(0)
        self.open += 1
        try:
            yield Connection(self.rows)
        finally:
            self.open -= 1
            self.released += 1


class CsvSink:
    def __init__(self):
        self.rows = []

    async def write(self, row):
        await asyncio.sleep(0)
        self.rows.append(row)


@test("Exports every active customer")
async def _():
    db, sink = Database(CUSTOMERS), CsvSink()
    assert await export_customers(db, sink) == 3
    assert sink.rows == CUSTOMERS


@test("Releases the connection afterwards")
async def _():
    db = Database(CUSTOMERS)
    await export_customers(db, CsvSink())
    assert (db.open, db.released) == (0, 1)


@hidden("No customers, nothing written")
async def _():
    db, sink = Database([]), CsvSink()
    assert await export_customers(db, sink) == 0
    assert sink.rows == []
    assert db.released == 1
