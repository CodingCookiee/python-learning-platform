from decimal import Decimal

import httpx

from plp import hidden, raises, test
from solution import get_rate

RATES = {("GBP", "EUR"): "1.1702", ("GBP", "USD"): "1.3391", ("EUR", "JPY"): "169.7400"}


class FxApi:
    def __init__(self):
        self.requests = []

    async def __call__(self, request):
        self.requests.append(request)
        pair = (request.url.params.get("base"), request.url.params.get("quote"))
        if pair not in RATES:
            return httpx.Response(404, json={"error": "unknown currency pair"})
        return httpx.Response(200, json={"base": pair[0], "quote": pair[1], "rate": RATES[pair]})

    def client(self):
        return httpx.AsyncClient(transport=httpx.MockTransport(self), base_url="https://api.fx.example", timeout=10)


@test("Gets GBP to EUR as a Decimal")
async def _():
    api = FxApi()
    async with api.client() as client:
        assert await get_rate(client, "GBP", "EUR") == Decimal("1.1702")


@test("Sends base and quote in the query string")
async def _():
    api = FxApi()
    async with api.client() as client:
        await get_rate(client, "GBP", "USD")
    [request] = api.requests
    assert (request.method, request.url.path) == ("GET", "/v1/rates")
    assert dict(request.url.params) == {"base": "GBP", "quote": "USD"}


@test("Keeps every digit")
async def _():
    api = FxApi()
    async with api.client() as client:
        rate = await get_rate(client, "EUR", "JPY")
    assert isinstance(rate, Decimal)
    assert str(rate) == "169.7400"


@hidden("An unknown pair raises")
async def _():
    api = FxApi()
    async with api.client() as client:
        with raises(httpx.HTTPStatusError, what='get_rate(client, "GBP", "XXX")'):
            await get_rate(client, "GBP", "XXX")
