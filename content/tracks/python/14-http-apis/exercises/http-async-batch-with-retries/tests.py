import asyncio
from decimal import Decimal

import httpx

from plp import hidden, test
from solution import sync_prices

PRICES = {"MUG-STN": "12.00", "ETH-1KG": "21.50", "DEC-250": "6.25", "V60-100": "4.80", "COL-1KG": "18.90"}


class Supplier:
    """A fake price API. script maps a SKU to a list of answers for its first requests:
    a status code, (status, Retry-After), or "drop" for a dropped connection. After that, it answers normally."""

    def __init__(self, script=None, delay=0.01):
        self.script = {sku: list(answers) for sku, answers in (script or {}).items()}
        self.delay = delay
        self.log = []
        self.in_flight = 0
        self.peak = 0

    async def __call__(self, request):
        sku = request.url.path.rsplit("/", 1)[-1]
        self.log.append(sku)
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(self.delay)
            answers = self.script.get(sku)
            if answers:
                answer = answers.pop(0)
                if answer == "drop":
                    raise httpx.RemoteProtocolError("server disconnected", request=request)
                status, wait = answer if isinstance(answer, tuple) else (answer, None)
                headers = {} if wait is None else {"Retry-After": wait}
                return httpx.Response(status, headers=headers, json={"error": "scripted"})
            if sku not in PRICES:
                return httpx.Response(404, json={"error": "unknown SKU"})
            return httpx.Response(200, json={"sku": sku, "price": PRICES[sku]})
        finally:
            self.in_flight -= 1

    def client(self):
        return httpx.AsyncClient(transport=httpx.MockTransport(self), base_url="https://api.supplier.example", timeout=10)


class FakeSleep:
    """Records each wait; really waits `pause` seconds so the rest of the batch can move meanwhile."""

    def __init__(self, pause=0.0):
        self.waits = []
        self.pause = pause

    async def __call__(self, seconds):
        self.waits.append(seconds)
        await asyncio.sleep(self.pause)


@test("Prices what it can, retries a rate limit, and reports the rest")
async def _():
    supplier = Supplier({"ETH-1KG": [(429, "2")]})
    sleep = FakeSleep()
    async with supplier.client() as client:
        prices, failed = await sync_prices(client, ["MUG-STN", "ETH-1KG", "GRD-HND", "DEC-250"], sleep=sleep)
    assert prices == {"MUG-STN": Decimal("12.00"), "ETH-1KG": Decimal("21.50"), "DEC-250": Decimal("6.25")}
    assert failed == {"GRD-HND": "HTTP 404"}
    assert sleep.waits == [2.0]


@test("Never more than limit requests in flight")
async def _():
    supplier = Supplier()
    skus = [f"SKU-{n:02}" for n in range(12)] + list(PRICES)
    async with supplier.client() as client:
        prices, failed = await sync_prices(client, skus, limit=4, sleep=FakeSleep())
    assert supplier.peak == 4
    assert list(prices) == list(PRICES)
    assert list(failed) == skus[:12]


@test("Gives up after the last attempt, backing off 1 then 2 seconds")
async def _():
    supplier = Supplier({"MUG-STN": [503, 503, 503], "ETH-1KG": ["drop", "drop", "drop"]})
    sleep = FakeSleep()
    async with supplier.client() as client:
        prices, failed = await sync_prices(client, ["MUG-STN", "ETH-1KG"], sleep=sleep)
    assert (prices, failed) == ({}, {"MUG-STN": "HTTP 503", "ETH-1KG": "no response"})
    assert supplier.log.count("MUG-STN") == 3
    assert sorted(sleep.waits) == [1, 1, 2, 2]


@test("A SKU waiting to retry doesn't hold a slot")
async def _():
    supplier = Supplier({"MUG-STN": [(429, "1")]})
    async with supplier.client() as client:
        prices, failed = await sync_prices(client, ["MUG-STN", "ETH-1KG"], limit=1, sleep=FakeSleep(pause=0.05))
    assert failed == {}
    assert supplier.log == ["MUG-STN", "ETH-1KG", "MUG-STN"], "ETH-1KG should go while MUG-STN waits"


@hidden("Errors that aren't worth retrying fail at once, and a recovered drop succeeds")
async def _():
    supplier = Supplier({"MUG-STN": [400], "DEC-250": ["drop"], "V60-100": [422]})
    sleep = FakeSleep()
    async with supplier.client() as client:
        prices, failed = await sync_prices(client, ["MUG-STN", "DEC-250", "V60-100"], sleep=sleep)
    assert prices == {"DEC-250": Decimal("6.25")}
    assert failed == {"MUG-STN": "HTTP 400", "V60-100": "HTTP 422"}
    assert (supplier.log.count("MUG-STN"), supplier.log.count("V60-100"), sleep.waits) == (1, 1, [1])
