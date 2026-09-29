import httpx

from plp import hidden, test
from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


GOOD = {"sku": "BEANS-1KG", "quantity": 3, "unit_price_cents": 1450}


@test("Quotes three bags of beans, and refuses a quantity of 0")
async def _():
    async with client() as api:
        assert (await api.post("/quotes", json=GOOD)).json() == {"sku": "BEANS-1KG", "quantity": 3, "total_cents": 4350}
        assert (await api.post("/quotes", json={**GOOD, "quantity": 0})).status_code == 422


@test("Numbers sent as text are converted, as Pydantic does")
async def _():
    async with client() as api:
        response = await api.post("/quotes", json={"sku": "MUG-01", "quantity": "2", "unit_price_cents": "800"})
    assert (response.status_code, response.json()) == (200, {"sku": "MUG-01", "quantity": 2, "total_cents": 1600})


@test("A missing field names the field in the error")
async def _():
    async with client() as api:
        response = await api.post("/quotes", json={"sku": "MUG-01", "quantity": 2})
    assert response.status_code == 422
    assert [problem["loc"] for problem in response.json()["detail"]] == [["body", "unit_price_cents"]]


@hidden("A body that isn't JSON is refused, and so is a query-string attempt")
async def _():
    async with client() as api:
        assert (await api.post("/quotes", content="sku=MUG-01")).status_code == 422
        assert (await api.post("/quotes?sku=MUG-01&quantity=1&unit_price_cents=800")).status_code == 422
