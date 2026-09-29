import httpx

from plp import hidden, test
from solution import app, recruiters


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


GRACE = {"email": "grace@harbourfreight.example", "name": "Grace", "company": "Harbour Freight", "password": "correct horse battery"}
ADA = {"email": "ada@kilncafe.example", "name": "Ada", "company": "Kiln Cafe", "password": "analytical engine 1843"}
PUBLIC = {"id", "email", "name", "company", "verified"}


@test("Signing up returns the recruiter without the password hash")
async def _():
    recruiters.clear()
    async with client() as api:
        response = await api.post("/recruiters", json=GRACE)
    assert (response.status_code, response.json()) == (201, {
        "id": 1,
        "email": "grace@harbourfreight.example",
        "name": "Grace",
        "company": "Harbour Freight",
        "verified": False,
    })


@test("Looking up one recruiter doesn't leak it either")
async def _():
    recruiters.clear()
    async with client() as api:
        await api.post("/recruiters", json=GRACE)
        assert set((await api.get("/recruiters/1")).json()) == PUBLIC


@test("Neither does the list")
async def _():
    recruiters.clear()
    async with client() as api:
        await api.post("/recruiters", json=GRACE)
        await api.post("/recruiters", json=ADA)
        listed = (await api.get("/recruiters")).json()
    assert [set(recruiter) for recruiter in listed] == [PUBLIC, PUBLIC]
    assert [recruiter["name"] for recruiter in listed] == ["Grace", "Ada"]


@test("The hash is still stored for logging in")
async def _():
    recruiters.clear()
    async with client() as api:
        await api.post("/recruiters", json=GRACE)
    assert len(recruiters[1].get("password_hash", "")) == 64


@hidden("The hash appears nowhere in any response body, and the docs don't mention it")
async def _():
    recruiters.clear()
    async with client() as api:
        texts = [
            (await api.post("/recruiters", json=ADA)).text,
            (await api.get("/recruiters/1")).text,
            (await api.get("/recruiters")).text,
        ]
        schema = (await api.get("/openapi.json")).text
    stored_hash = recruiters[1]["password_hash"]
    assert [stored_hash in text or "password" in text for text in texts] == [False, False, False]
    assert "password_hash" not in schema
