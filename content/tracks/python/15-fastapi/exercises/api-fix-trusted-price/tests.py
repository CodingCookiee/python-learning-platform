import httpx

from plp import hidden, test
from solution import app, orders

KILN, HARBOUR = {"X-API-Key": "ck_kiln_51f0"}, {"X-API-Key": "ck_harbour_9a2e"}


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def order(headers, body):
    async with client() as api:
        response = await api.post("/orders", json=body, headers=headers)
    return response.status_code, response.json()


@test("Kiln orders three mugs; the audited order is refused")
async def _():
    orders.clear()
    assert await order(KILN, {"sku": "MUG-01", "quantity": 3}) == (
        201,
        {"id": 1, "customer_id": "kiln-cafe", "sku": "MUG-01", "quantity": 3, "total_cents": 2400},
    )
    status, _ = await order(HARBOUR, {"customer_id": "kiln-cafe", "sku": "BEANS-1KG", "quantity": 40, "unit_price_cents": 1})
    assert status == 422


@test("The customer comes from the API key")
async def _():
    orders.clear()
    status, body = await order(HARBOUR, {"sku": "V60-100", "quantity": 2})
    assert (status, body.get("customer_id"), body.get("total_cents")) == (201, "harbour-freight", 900)


@test("A price or a customer in the body is refused, and nothing is stored")
async def _():
    orders.clear()
    assert (await order(KILN, {"sku": "MUG-01", "quantity": 1, "unit_price_cents": 1}))[0] == 422
    assert (await order(KILN, {"sku": "MUG-01", "quantity": 1, "customer_id": "harbour-freight"}))[0] == 422
    assert orders == []


@test("An unknown SKU is refused")
async def _():
    orders.clear()
    assert await order(KILN, {"sku": "GOLD-BAR", "quantity": 1}) == (422, {"detail": "Unknown SKU: GOLD-BAR"})
    assert orders == []


@hidden("No key is still a 401, and the stored order matches the response")
async def _():
    orders.clear()
    assert (await order({}, {"sku": "MUG-01", "quantity": 1}))[0] == 401
    status, body = await order(KILN, {"sku": "BEANS-1KG", "quantity": 40})
    assert (status, body["total_cents"]) == (201, 96000)
    assert orders == [body]
