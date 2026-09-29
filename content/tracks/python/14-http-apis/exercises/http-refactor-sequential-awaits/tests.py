import asyncio

import httpx

from plp import hidden, raises, test
from solution import fetch_stock_levels

STOCK = {"MUG-STN": 5, "ETH-1KG": 6, "V60-100": 0, "DEC-250": 12, "COL-1KG": 16, "GRD-HND": 4}


class Warehouse:
    """A fake warehouse API that measures how many requests are in flight at once."""

    def __init__(self, delays=None):
        self.delays = delays or {}
        self.in_flight = 0
        self.peak = 0

    async def __call__(self, request):
        sku = request.url.path.rsplit("/", 1)[-1]
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(self.delays.get(sku, 0.02))
            if sku not in STOCK:
                return httpx.Response(404, json={"error": "unknown SKU"})
            return httpx.Response(200, json={"sku": sku, "available": STOCK[sku]})
        finally:
            self.in_flight -= 1

    def client(self):
        return httpx.AsyncClient(transport=httpx.MockTransport(self), base_url="https://api.warehouse.example", timeout=10)


@test("Fetches three SKUs with all three in flight together")
async def _():
    warehouse = Warehouse()
    async with warehouse.client() as client:
        assert await fetch_stock_levels(client, ["MUG-STN", "ETH-1KG", "V60-100"]) == {"MUG-STN": 5, "ETH-1KG": 6, "V60-100": 0}
    assert warehouse.peak == 3, "All the requests should be in flight at the same time"


@test("Keeps the order of skus, whatever order the answers arrive in")
async def _():
    skus = list(STOCK)
    warehouse = Warehouse(delays={sku: 0.01 * (len(skus) - n) for n, sku in enumerate(skus)})
    async with warehouse.client() as client:
        levels = await fetch_stock_levels(client, skus)
    assert list(levels.items()) == list(STOCK.items())
    assert warehouse.peak == len(skus)


@test("A failed request still raises")
async def _():
    warehouse = Warehouse()
    async with warehouse.client() as client:
        with raises((httpx.HTTPStatusError, ExceptionGroup), what="fetch_stock_levels(client, [..., 'NOPE-404'])"):
            await fetch_stock_levels(client, ["MUG-STN", "NOPE-404", "ETH-1KG"])


@hidden("No SKUs, no requests")
async def _():
    warehouse = Warehouse()
    async with warehouse.client() as client:
        assert await fetch_stock_levels(client, []) == {}
    assert warehouse.peak == 0
