import asyncio

from plp import hidden, test
from solution import large_orders

TODAY = [
    {"id": "A-1042", "total": 34.0},
    {"id": "A-1043", "total": 410.0},
    {"id": "A-1044", "total": 249.99},
    {"id": "A-1045", "total": 12.5},
    {"id": "A-1046", "total": 250.0},
]


class OrderFeed:
    """A fake live feed: async iteration only, one order per await."""

    def __init__(self, orders):
        self.orders = list(orders)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self.orders:
            raise StopAsyncIteration
        await asyncio.sleep(0)
        return self.orders.pop(0)


@test("Finds today's large orders")
async def _():
    assert await large_orders(OrderFeed(TODAY), 250) == ["A-1043", "A-1046"]


@test("A lower threshold catches more")
async def _():
    assert await large_orders(OrderFeed(TODAY), 30) == ["A-1042", "A-1043", "A-1044", "A-1046"]


@hidden("An empty feed, or no large orders")
async def _():
    assert await large_orders(OrderFeed([]), 100) == []
    assert await large_orders(OrderFeed(TODAY), 1000) == []
