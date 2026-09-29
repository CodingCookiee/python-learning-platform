import ast
from datetime import UTC, datetime, timedelta

import httpx

import solution
from plp import hidden, solution_source, test
from solution import app, bookings

STARTS_AT = datetime(2026, 10, 10, 9, 0, tzinfo=UTC)


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


def at(moment):
    """Pin the clock at moment, through the get_now dependency."""
    get_now = getattr(solution, "get_now", None)
    assert callable(get_now), "Add a get_now() function that returns datetime.now(UTC)"
    bookings["B-1001"]["status"] = "confirmed"
    app.dependency_overrides.clear()
    app.dependency_overrides[get_now] = lambda: moment


async def send(method, path):
    try:
        async with client() as api:
            response = await api.request(method, path)
        return response.status_code, response.json()
    finally:
        app.dependency_overrides.clear()


@test("47 hours before the tour: no cancelling, and no refund")
async def _():
    at(STARTS_AT - timedelta(hours=47))
    assert (await send("POST", "/bookings/B-1001/cancel"))[0] == 409
    at(STARTS_AT - timedelta(hours=47))
    assert await send("GET", "/bookings/B-1001/refund") == (200, {"booking_id": "B-1001", "refund_percent": 0})


@test("Three days before: a 50% refund, and cancelling works")
async def _():
    at(STARTS_AT - timedelta(days=3))
    assert await send("GET", "/bookings/B-1001/refund") == (200, {"booking_id": "B-1001", "refund_percent": 50})
    at(STARTS_AT - timedelta(days=3))
    status, body = await send("POST", "/bookings/B-1001/cancel")
    assert (status, body.get("status")) == (200, "cancelled")


@test("A week or more before: a full refund")
async def _():
    at(STARTS_AT - timedelta(days=7))
    assert await send("GET", "/bookings/B-1001/refund") == (200, {"booking_id": "B-1001", "refund_percent": 100})


@test("Only get_now reads the real clock")
def _():
    calls = [
        node for node in ast.walk(ast.parse(solution_source()))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "now"
    ]
    assert len(calls) == 1, f"datetime.now is called {len(calls)} times; only get_now should call it"


@hidden("Exactly 48 hours before still counts, and unknown bookings are a 404")
async def _():
    at(STARTS_AT - timedelta(hours=48))
    status, body = await send("POST", "/bookings/B-1001/cancel")
    assert (status, body.get("status")) == (200, "cancelled")
    at(STARTS_AT)
    assert (await send("GET", "/bookings/B-9999/refund"))[0] == 404
