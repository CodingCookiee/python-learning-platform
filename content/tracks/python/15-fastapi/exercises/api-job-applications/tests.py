import httpx

from plp import hidden, test
from solution import app, applications


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


GRACE = {
    "name": "Grace Hopper",
    "email": "grace@example.com",
    "role": "backend-engineer",
    "cover_letter": "I wrote the first compiler...",
}
KATHERINE = {
    "name": "Katherine Johnson",
    "email": "katherine@example.com",
    "role": "data-analyst",
    "cover_letter": "I check the numbers.",
}


@test("An application comes back as a summary, with 201")
async def _():
    applications.clear()
    async with client() as api:
        response = await api.post("/applications", json=GRACE)
    assert (response.status_code, response.json()) == (
        201,
        {"id": 1, "name": "Grace Hopper", "role": "backend-engineer", "status": "received"},
    )


@test("Everything is stored, including the private fields")
async def _():
    applications.clear()
    async with client() as api:
        await api.post("/applications", json=GRACE)
    assert applications.get(1, {}).get("email") == "grace@example.com"
    assert applications.get(1, {}).get("cover_letter") == "I wrote the first compiler..."


@test("Lists and filters by role, without emails or cover letters")
async def _():
    applications.clear()
    async with client() as api:
        await api.post("/applications", json=GRACE)
        await api.post("/applications", json=KATHERINE)
        everyone = (await api.get("/applications")).json()
        analysts = (await api.get("/applications?role=data-analyst")).json()
        assert (await api.get("/applications?role=astronaut")).status_code == 422
    assert [application["name"] for application in everyone] == ["Grace Hopper", "Katherine Johnson"]
    assert analysts == [{"id": 2, "name": "Katherine Johnson", "role": "data-analyst", "status": "received"}]


@test("Bad applications are refused")
async def _():
    applications.clear()
    async with client() as api:
        assert (await api.post("/applications", json={**GRACE, "role": "astronaut"})).status_code == 422
        assert (await api.post("/applications", json={**GRACE, "cover_letter": "x" * 2001})).status_code == 422
        assert (await api.post("/applications", json={**GRACE, "name": ""})).status_code == 422
    assert applications == {}


@hidden("A client can't choose its own status, and one application can be fetched")
async def _():
    applications.clear()
    async with client() as api:
        await api.post("/applications", json=GRACE)
        created = (await api.post("/applications", json={**KATHERINE, "status": "hired"})).json()
        fetched = (await api.get("/applications/2")).json()
    assert created["status"] == "received"
    assert fetched == {"id": 2, "name": "Katherine Johnson", "role": "data-analyst", "status": "received"}
