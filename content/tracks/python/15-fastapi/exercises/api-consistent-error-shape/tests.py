import httpx

from plp import hidden, test
from solution import app


def client():
    # An unhandled exception comes back as a 500, as a real client would see it
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


async def send(method, path, body=None):
    """One request; returns (status code, JSON body)."""
    async with client() as api:
        response = await api.request(method, path, json=body)
    try:
        return response.status_code, response.json()
    except ValueError:
        return response.status_code, response.text


@test("A missing booking, an unknown path and an unavailable room")
async def _():
    assert await send("GET", "/bookings/99") == (404, {"error": {"code": "not_found", "message": "Booking 99 not found"}})
    assert await send("GET", "/nowhere") == (404, {"error": {"code": "not_found", "message": "Not Found"}})
    assert await send("POST", "/bookings", {"room_number": 204, "check_in": "2026-10-01", "nights": 2}) == (
        409,
        {"error": {"code": "room_unavailable", "message": "Room 204 is not available on 2026-10-01"}},
    )


@test("Validation errors list each field")
async def _():
    assert await send("POST", "/bookings", {"room_number": 204, "check_in": "2026-10-01", "nights": 0}) == (
        422,
        {
            "error": {
                "code": "validation_failed",
                "message": "The request is invalid",
                "fields": [{"field": "body.nights", "message": "Input should be greater than or equal to 1"}],
            }
        },
    )


@test("A 405 keeps its code and its Allow header")
async def _():
    async with client() as api:
        response = await api.delete("/bookings/1")
    assert (response.status_code, response.json()) == (
        405,
        {"error": {"code": "method_not_allowed", "message": "Method Not Allowed"}},
    )
    assert response.headers.get("allow") == "GET"


@test("Successful requests are untouched")
async def _():
    assert await send("GET", "/bookings/1") == (200, {"id": 1, "room_number": 101, "check_in": "2026-10-01", "nights": 3})
    status, body = await send("POST", "/bookings", {"room_number": 312, "check_in": "2026-10-02", "nights": 1})
    assert (status, body.get("room_number")) == (201, 312)


@hidden("Several problems at once, in a path parameter and in the body")
async def _():
    status, body = await send("POST", "/bookings", {"check_in": "soon", "nights": 30})
    assert status == 422
    assert [field["field"] for field in body["error"]["fields"]] == ["body.room_number", "body.check_in", "body.nights"]
    status, body = await send("GET", "/bookings/first")
    assert (status, body["error"]["fields"][0]["field"]) == (422, "path.booking_id")
