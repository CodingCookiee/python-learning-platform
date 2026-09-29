import asyncio

from plp import hidden, test
from solution import fetch_prices

PRICES = {"ETH-1KG": 14.20, "MUG-STN": 5.60, "V60-100": 2.35, "DEC-250": 4.10}
DELAYS = {"ETH-1KG": 0.03, "MUG-STN": 0.01, "V60-100": 0.02, "DEC-250": 0.0}


class PricingClient:
    """A fake async pricing API that counts how many requests are in flight at once."""

    def __init__(self):
        self.in_flight = 0
        self.peak = 0

    async def price(self, sku):
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(DELAYS[sku])
        finally:
            self.in_flight -= 1
        return PRICES[sku]


@test("Prices three SKUs")
async def _():
    assert await fetch_prices(PricingClient(), ["ETH-1KG", "MUG-STN", "V60-100"]) == {
        "ETH-1KG": 14.2,
        "MUG-STN": 5.6,
        "V60-100": 2.35,
    }


@test("Every request is in flight at the same time")
async def _():
    client = PricingClient()
    await fetch_prices(client, ["ETH-1KG", "MUG-STN", "V60-100", "DEC-250"])
    assert client.peak == 4, f"at most {client.peak} request(s) were in flight at once"


@test("Keeps the order of the SKUs, not the order the replies arrived in")
async def _():
    prices = await fetch_prices(PricingClient(), ["MUG-STN", "ETH-1KG", "DEC-250"])
    assert list(prices) == ["MUG-STN", "ETH-1KG", "DEC-250"]


@hidden("No SKUs, no prices")
async def _():
    assert await fetch_prices(PricingClient(), []) == {}
