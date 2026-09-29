import asyncio
import inspect

from plp import hidden, test
from solution import iter_orders


class OrdersAPI:
    """A fake paginated API. `pages` is a list of lists of order ids."""

    def __init__(self, pages):
        self.pages = pages
        self.fetched = []

    async def page(self, cursor):
        self.fetched.append(cursor)
        await asyncio.sleep(0)
        index = 0 if cursor is None else int(cursor.removeprefix("c"))
        more = index + 1 < len(self.pages)
        return {"orders": [{"id": order_id} for order_id in self.pages[index]], "next": f"c{index + 1}" if more else None}


async def ids(orders, limit=None):
    found = []
    async for order in orders:
        found.append(order["id"])
        if len(found) == limit:
            break
    return found


@test("Yields every order from every page")
async def _():
    api = OrdersAPI([["A-1", "A-2"], ["A-3", "A-4"], ["A-5"]])
    assert await ids(iter_orders(api)) == ["A-1", "A-2", "A-3", "A-4", "A-5"]
    assert api.fetched == [None, "c1", "c2"]


@test("iter_orders is an async generator")
def _():
    assert inspect.isasyncgenfunction(iter_orders), "use async def with yield"


@test("Only fetches the pages it needs")
async def _():
    api = OrdersAPI([["A-1", "A-2"], ["A-3", "A-4"], ["A-5"]])
    assert await ids(iter_orders(api), limit=3) == ["A-1", "A-2", "A-3"]
    assert api.fetched == [None, "c1"], f"it fetched {len(api.fetched)} pages for 3 orders"


@hidden("An empty page in the middle doesn't end it")
async def _():
    api = OrdersAPI([["A-1"], [], ["A-2"]])
    assert await ids(iter_orders(api)) == ["A-1", "A-2"]


@hidden("A single empty page yields nothing")
async def _():
    api = OrdersAPI([[]])
    assert await ids(iter_orders(api)) == []
    assert api.fetched == [None]
