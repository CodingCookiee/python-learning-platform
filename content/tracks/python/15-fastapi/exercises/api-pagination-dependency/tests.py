import httpx

from plp import hidden, test
from solution import Page, app, pagination


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def get(path):
    async with client() as api:
        response = await api.get(path)
    return response.status_code, response.json()


@test("Pages through invoices and customers, and refuses a huge limit")
async def _():
    status, data = await get("/invoices?offset=50&limit=5")
    assert (status, data["total"]) == (200, 57)
    assert [invoice["number"] for invoice in data["items"]] == ["INV-0051", "INV-0052", "INV-0053", "INV-0054", "INV-0055"]
    status, data = await get("/customers")
    assert (data["total"], [customer["id"] for customer in data["items"]]) == (23, list(range(1, 11)))
    assert (await get("/customers?limit=100"))[0] == 422


@test("Both endpoints refuse a negative offset and a zero limit")
async def _():
    assert (await get("/customers?offset=-1"))[0] == 422
    assert (await get("/invoices?limit=0"))[0] == 422


@test("pagination returns a Page")
def _():
    assert pagination(offset=20, limit=5) == Page(20, 5)


@hidden("An offset past the end gives an empty page, and limit=50 is allowed")
async def _():
    status, data = await get("/customers?offset=40")
    assert (status, data["items"], data["total"]) == (200, [], 23)
    status, data = await get("/invoices?limit=50")
    assert len(data["items"]) == 50
