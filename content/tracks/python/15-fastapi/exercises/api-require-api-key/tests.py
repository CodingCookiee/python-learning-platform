import httpx

from plp import hidden, source_uses, test
from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def deliveries(key=None):
    headers = {} if key is None else {"X-API-Key": key}
    async with client() as api:
        response = await api.get("/deliveries", headers=headers)
    return response.status_code, response.json()


@test("No key, a wrong key and a right key")
async def _():
    assert await deliveries() == (401, {"detail": "Missing API key"})
    assert await deliveries("pk_live_guess") == (401, {"detail": "Invalid API key"})
    status, body = await deliveries("pk_live_kiln_7f3a9c")
    assert (status, body.get("partner")) == (200, "Kiln Cafe")


@test("Each key sees its own partner's deliveries")
async def _():
    status, body = await deliveries("pk_live_harbour_2b81d4")
    assert (status, body["partner"], body["deliveries"][0]["quantity"]) == (200, "Harbour Freight", 40)


@test("A 401 says which scheme to use")
async def _():
    async with client() as api:
        missing = await api.get("/deliveries")
        invalid = await api.get("/deliveries", headers={"X-API-Key": "nope"})
    assert missing.headers.get("www-authenticate") == "ApiKey"
    assert invalid.headers.get("www-authenticate") == "ApiKey"


@test("Keys are compared with secrets.compare_digest, and /health needs no key")
async def _():
    assert source_uses(call="compare_digest"), "Compare keys with secrets.compare_digest"
    async with client() as api:
        assert (await api.get("/health")).status_code == 200


@hidden("Almost-right keys are refused, and the header name is case-insensitive")
async def _():
    assert (await deliveries("pk_live_kiln_7f3a9"))[0] == 401
    assert (await deliveries("PK_LIVE_KILN_7F3A9C"))[0] == 401
    assert (await deliveries(""))[0] == 401
    async with client() as api:
        response = await api.get("/deliveries", headers={"x-api-key": "pk_live_kiln_7f3a9c"})
    assert response.status_code == 200
