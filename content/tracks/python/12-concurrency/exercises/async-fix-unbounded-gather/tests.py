import asyncio

from plp import hidden, test
from solution import sync_products


class RateLimited(Exception):
    pass


class StorefrontAPI:
    """A fake storefront API that refuses more than `allowed` requests in flight."""

    def __init__(self, allowed=5):
        self.allowed = allowed
        self.in_flight = 0
        self.peak = 0

    async def upsert(self, product):
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            if self.in_flight > self.allowed:
                raise RateLimited(
                    f"429 Too Many Requests ({self.in_flight} requests in flight, the limit is {self.allowed})"
                )
            await asyncio.sleep(0.01)
            return f"sf_{product['sku'].removeprefix('SKU-')}"
        finally:
            self.in_flight -= 1


def catalogue(count):
    return [{"sku": f"SKU-{n}", "name": f"Product {n}"} for n in range(1, count + 1)]


@test("Syncs the whole catalogue")
async def _():
    assert await sync_products(StorefrontAPI(), catalogue(12)) == [f"sf_{n}" for n in range(1, 13)]


@test("Keeps exactly 5 requests in flight")
async def _():
    api = StorefrontAPI()
    await sync_products(api, catalogue(12))
    assert api.peak == 5, f"at most {api.peak} request(s) were in flight at once; the API allows 5"


@test("limit sets how many requests are in flight")
async def _():
    api = StorefrontAPI(allowed=2)
    assert await sync_products(api, catalogue(6), limit=2) == [f"sf_{n}" for n in range(1, 7)]
    assert api.peak == 2


@hidden("A small catalogue runs all at once")
async def _():
    api = StorefrontAPI()
    assert await sync_products(api, catalogue(3)) == ["sf_1", "sf_2", "sf_3"]
    assert api.peak == 3


@hidden("A big catalogue never goes over the limit")
async def _():
    api = StorefrontAPI()
    ids = await sync_products(api, catalogue(60))
    assert len(ids) == 60 and api.peak == 5
