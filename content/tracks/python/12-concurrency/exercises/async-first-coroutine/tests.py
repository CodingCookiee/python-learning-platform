import asyncio
import inspect

from plp import hidden, test
from solution import order_total

ORDERS = {
    "A-1042": {"id": "A-1042", "lines": [
        {"sku": "ETH-1KG", "quantity": 2, "unit_price": 14.20},
        {"sku": "MUG-STN", "quantity": 1, "unit_price": 5.60},
    ]},
    "A-1043": {"id": "A-1043", "lines": [
        {"sku": "V60-100", "quantity": 3, "unit_price": 2.35},
        {"sku": "DEC-250", "quantity": 1, "unit_price": 4.10},
    ]},
    "A-1044": {"id": "A-1044", "lines": []},
}


class OrderClient:
    """A fake async order API that records what it was asked for."""

    def __init__(self):
        self.requested = []

    async def fetch_order(self, order_id):
        self.requested.append(order_id)
        await asyncio.sleep(0.01)
        return ORDERS[order_id]


@test("Totals order A-1042")
async def _():
    assert await order_total(OrderClient(), "A-1042") == 34.0


@test("order_total is a coroutine function")
def _():
    assert inspect.iscoroutinefunction(order_total), "define it with async def"


@test("Rounds to cents")
async def _():
    assert await order_total(OrderClient(), "A-1043") == 11.15


@hidden("Fetches the order once, and an empty order totals 0")
async def _():
    client = OrderClient()
    assert await order_total(client, "A-1044") == 0
    assert client.requested == ["A-1044"]
