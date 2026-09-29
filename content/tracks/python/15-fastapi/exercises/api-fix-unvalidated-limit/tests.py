import httpx

from plp import hidden, test
from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def status_of(query):
    async with client() as api:
        return (await api.get(f"/orders?{query}")).status_code


async def order_ids(query):
    async with client() as api:
        return [order["id"] for order in (await api.get(f"/orders?{query}")).json()["orders"]]


@test("The three bad requests are refused, and a normal page still works")
async def _():
    assert await status_of("page=0") == 422
    assert await status_of("per_page=50000") == 422
    assert await status_of("status=shiped") == 422
    assert await order_ids("page=2&per_page=3") == ["A1004", "A1005", "A1006"]


@test("per_page must be at least 1, and page can't be negative")
async def _():
    assert await status_of("per_page=0") == 422
    assert await status_of("page=-2") == 422


@test("The defaults and the real statuses still work")
async def _():
    assert len(await order_ids("")) == 20
    assert await order_ids("status=shipped&per_page=2") == ["A1002", "A1005"]


@hidden("The limits are inclusive: per_page=100 works and 101 doesn't")
async def _():
    assert len(await order_ids("per_page=100")) == 100
    assert await status_of("per_page=101") == 422
    assert await order_ids("page=3&per_page=100&status=pending") == []


@hidden("The limits show up in the OpenAPI docs")
async def _():
    async with client() as api:
        parameters = (await api.get("/openapi.json")).json()["paths"]["/orders"]["get"]["parameters"]
    per_page = next(parameter for parameter in parameters if parameter["name"] == "per_page")
    assert (per_page["schema"].get("minimum"), per_page["schema"].get("maximum")) == (1, 100)
