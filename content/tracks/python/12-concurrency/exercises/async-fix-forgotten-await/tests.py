import asyncio

from plp import hidden, test
from solution import basket_total

PRICES = {"ETH-1KG": 14.20, "MUG-STN": 5.60, "V60-100": 2.35}


class PricingClient:
    """A fake async pricing API with an audit log."""

    def __init__(self):
        self.priced = []
        self.audit_log = []

    async def price(self, sku):
        self.priced.append(sku)
        await asyncio.sleep(0.01)
        return PRICES[sku]

    async def audit(self, event, skus, total):
        await asyncio.sleep(0.01)
        self.audit_log.append((event, list(skus), total))


@test("Totals the basket")
async def _():
    assert await basket_total(PricingClient(), ["ETH-1KG", "MUG-STN"]) == 19.8


@test("Records the quote in the audit log")
async def _():
    client = PricingClient()
    await basket_total(client, ["ETH-1KG", "MUG-STN"])
    assert client.audit_log == [("quote", ["ETH-1KG", "MUG-STN"], 19.8)]


@test("An empty basket is 0, and is still audited")
async def _():
    client = PricingClient()
    assert await basket_total(client, []) == 0
    assert client.audit_log == [("quote", [], 0)]


@hidden("Prices each SKU once")
async def _():
    client = PricingClient()
    assert await basket_total(client, ["V60-100", "V60-100", "MUG-STN"]) == 10.3
    assert client.priced == ["V60-100", "V60-100", "MUG-STN"]
