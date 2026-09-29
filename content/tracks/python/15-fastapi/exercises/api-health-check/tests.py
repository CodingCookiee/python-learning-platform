import httpx

from plp import hidden, test
from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


@test('GET /health answers {"status": "ok"}')
async def _():
    async with client() as api:
        assert (await api.get("/health")).json() == {"status": "ok"}


@test("It answers 200 with a JSON content type")
async def _():
    async with client() as api:
        response = await api.get("/health")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"


@hidden("Only GET is allowed")
async def _():
    async with client() as api:
        assert (await api.post("/health")).status_code == 405
