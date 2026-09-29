import httpx

from plp import hidden, test
from solution import app, database


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


ADA = {"email": "ada@kilncafe.example", "name": "Ada"}
GRACE = {"email": "grace@harbourfreight.example", "name": "Grace"}
KATHERINE = {"email": "katherine@tidewater.example", "name": "Katherine"}


def reset():
    database.customers.clear()
    database.log.clear()


async def post(path, body):
    async with client() as api:
        return (await api.post(path, json=body)).status_code


@test("A new customer is committed; a duplicate is rolled back")
async def _():
    reset()
    assert await post("/customers", ADA) == 201
    assert database.log == ["open", "commit", "close"]
    database.log.clear()
    assert await post("/customers", ADA) == 409
    assert database.log == ["open", "rollback", "close"]


@test("Committed customers are really saved")
async def _():
    reset()
    await post("/customers", ADA)
    await post("/customers", GRACE)
    assert [customer["name"] for customer in database.customers] == ["Ada", "Grace"]


@test("A refused import saves nothing at all")
async def _():
    reset()
    await post("/customers", GRACE)
    database.log.clear()
    assert await post("/customers/import", [KATHERINE, ADA, GRACE]) == 409
    assert [customer["name"] for customer in database.customers] == ["Grace"]
    assert database.log == ["open", "rollback", "close"]


@test("A successful import saves every customer in one commit")
async def _():
    reset()
    assert await post("/customers/import", [ADA, KATHERINE]) == 201
    assert [customer["name"] for customer in database.customers] == ["Ada", "Katherine"]
    assert database.log == ["open", "commit", "close"]


@hidden("Each request gets its own session, and an invalid body saves nothing")
async def _():
    reset()
    await post("/customers", ADA)
    await post("/customers", GRACE)
    assert database.log == ["open", "commit", "close", "open", "commit", "close"]
    assert await post("/customers", {"email": "no-name@example.com"}) == 422
    assert len(database.customers) == 2
    assert database.log[-1] == "close"
