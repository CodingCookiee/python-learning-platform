import httpx

from plp import hidden, source_uses, test
from solution import Settings, create_app


def kayaks():
    return create_app(Settings(
        service_name="Kayak tours",
        admin_key="kayak-admin",
        max_party_size=6,
        allowed_origins=["https://kayaks.example.com"],
    ))


def ferry():
    return create_app(Settings(service_name="Island ferry", admin_key="ferry-admin", max_party_size=40))


async def send(app, method, path, body=None, headers=None):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as api:
        response = await api.request(method, path, json=body, headers=headers or {})
    return response.status_code, response.json() if response.content else None


@test("Each brand has its own limits and its own admin key")
async def _():
    kayak_app, ferry_app = kayaks(), ferry()
    assert await send(kayak_app, "POST", "/bookings", {"guest_name": "Ada", "party_size": 4}) == (
        201, {"id": 1, "guest_name": "Ada", "party_size": 4})
    assert await send(kayak_app, "POST", "/bookings", {"guest_name": "Grace", "party_size": 12}) == (
        422, {"detail": "Party size is limited to 6"})
    status, body = await send(ferry_app, "POST", "/bookings", {"guest_name": "Grace", "party_size": 12})
    assert (status, body and body.get("id")) == (201, 1)
    assert (await send(ferry_app, "GET", "/admin/stats", headers={"X-Admin-Key": "kayak-admin"}))[0] == 401


@test("Two apps never share bookings")
async def _():
    first, second = kayaks(), kayaks()
    await send(first, "POST", "/bookings", {"guest_name": "Ada", "party_size": 2})
    await send(first, "POST", "/bookings", {"guest_name": "Katherine", "party_size": 3})
    assert await send(second, "GET", "/bookings") == (200, [])
    assert await send(first, "GET", "/admin/stats", headers={"X-Admin-Key": "kayak-admin"}) == (
        200, {"bookings": 2, "guests": 5})


@test("The admin routes need the right key")
async def _():
    app = ferry()
    assert await send(app, "GET", "/admin/stats") == (401, {"detail": "Admin key required"})
    assert await send(app, "GET", "/admin/stats", headers={"X-Admin-Key": "ferry-admin"}) == (
        200, {"bookings": 0, "guests": 0})
    assert source_uses(call="compare_digest"), "Compare admin keys with secrets.compare_digest"


@test("CORS allows each brand's own front end only")
async def _():
    app = kayaks()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as api:
        allowed = await api.options("/bookings", headers={"Origin": "https://kayaks.example.com", "Access-Control-Request-Method": "POST"})
        refused = await api.options("/bookings", headers={"Origin": "https://ferry.example.com", "Access-Control-Request-Method": "POST"})
    assert (allowed.status_code, allowed.headers.get("access-control-allow-origin")) == (200, "https://kayaks.example.com")
    assert refused.status_code == 400


@hidden("Titles, tags and paths in the docs")
async def _():
    schema = kayaks().openapi()
    assert schema["info"]["title"] == "Kayak tours"
    assert schema["paths"]["/bookings"]["post"]["tags"] == ["bookings"]
    assert schema["paths"]["/admin/stats"]["get"]["tags"] == ["admin"]
    assert ferry().openapi()["info"]["title"] == "Island ferry"
