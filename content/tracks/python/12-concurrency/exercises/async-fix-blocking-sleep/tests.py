import asyncio

from plp import hidden, raises_async, source_avoids, source_uses, test
from solution import fetch_with_retry

URL = "https://shop.example.com/p/ETH-1KG"
SLACK = 0.005


class FlakyShop:
    """A fake async HTTP client that fails the first `failures` requests with ConnectionError."""

    def __init__(self, failures):
        self.failures = failures
        self.attempts = []

    async def get(self, url):
        self.attempts.append(asyncio.get_running_loop().time())
        await asyncio.sleep(0)
        if len(self.attempts) <= self.failures:
            raise ConnectionError("503 Service Unavailable")
        return f"<html>{url.rsplit('/', 1)[-1]}</html>"


@test("Gets the page after two retries")
async def _():
    shop = FlakyShop(failures=2)
    assert await fetch_with_retry(shop, URL) == "<html>ETH-1KG</html>"
    assert len(shop.attempts) == 3


@test("Waits without blocking the event loop")
def _():
    assert source_avoids(call="time.sleep"), "time.sleep blocks the whole event loop while it waits"
    assert source_uses(call="asyncio.sleep"), "pause with await asyncio.sleep(...)"


@test("Pauses backoff * attempt seconds between tries")
async def _():
    shop = FlakyShop(failures=2)
    await fetch_with_retry(shop, URL, backoff=0.04)
    first_gap, second_gap = (b - a for a, b in zip(shop.attempts, shop.attempts[1:]))
    assert first_gap >= 0.04 - SLACK, f"waited {first_gap:.3f} s before the second try"
    assert second_gap >= 0.08 - SLACK, f"waited {second_gap:.3f} s before the third try"


@test("Gives up with the last ConnectionError")
async def _():
    shop = FlakyShop(failures=10)
    await raises_async(ConnectionError, fetch_with_retry, shop, URL, attempts=2, backoff=0.01, match="503")
    assert len(shop.attempts) == 2


@hidden("Five retrying fetches wait side by side")
async def _():
    shops = [FlakyShop(failures=1) for _ in range(5)]
    loop = asyncio.get_running_loop()
    start = loop.time()
    await asyncio.gather(*(fetch_with_retry(shop, URL, backoff=0.05) for shop in shops))
    elapsed = loop.time() - start
    assert elapsed < 0.2, f"five fetches that each wait 0.05 s took {elapsed:.2f} s"
