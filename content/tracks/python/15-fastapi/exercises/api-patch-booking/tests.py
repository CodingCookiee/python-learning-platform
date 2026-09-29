from datetime import date

import httpx

from plp import hidden, test
from solution import app, bookings


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


def reset():
    bookings.clear()
    bookings[7] = {"id": 7, "guest_name": "Ada Lovelace", "guests": 2, "check_in": date(2026, 10, 1), "notes": "Late arrival"}
    bookings[8] = {"id": 8, "guest_name": "Grace Hopper", "guests": 1, "check_in": date(2026, 10, 3), "notes": None}


async def patch(booking_id, body):
    """PATCH one booking; returns (status code, JSON body)."""
    async with client() as api:
        response = await api.patch(f"/bookings/{booking_id}", json=body)
    data = response.json()
    return response.status_code, data if isinstance(data, dict) else {"body": data}


@test("Changing the number of guests leaves everything else alone")
async def _():
    reset()
    assert await patch(7, {"guests": 3}) == (200, {
        "id": 7,
        "guest_name": "Ada Lovelace",
        "guests": 3,
        "check_in": "2026-10-01",
        "notes": "Late arrival",
    })


@test("An explicit null clears the note")
async def _():
    reset()
    status, data = await patch(7, {"notes": None})
    assert (status, data.get("notes"), data.get("guests")) == (200, None, 2)
    assert bookings[7]["notes"] is None


@test("guests and check_in can't be null, and nothing changes when they're refused")
async def _():
    reset()
    assert (await patch(7, {"guests": None}))[0] == 422
    assert (await patch(7, {"check_in": None}))[0] == 422
    assert (bookings[7]["guests"], bookings[7]["check_in"]) == (2, date(2026, 10, 1))


@test("Unknown keys are refused, including fields that can't be changed")
async def _():
    reset()
    assert (await patch(7, {"guest_name": "Eve"}))[0] == 422
    assert (await patch(7, {"guest": 3}))[0] == 422
    assert bookings[7]["guest_name"] == "Ada Lovelace"


@test("The rules on each field still apply")
async def _():
    reset()
    assert (await patch(8, {"guests": 7}))[0] == 422
    assert (await patch(8, {"check_in": "next Friday"}))[0] == 422
    assert (await patch(8, {"notes": "x" * 501}))[0] == 422


@hidden("Several fields at once, an empty patch, and the stored date stays a date")
async def _():
    reset()
    status, data = await patch(8, {"check_in": "2026-10-05", "notes": "Quiet room please"})
    assert (status, data["check_in"], data["notes"], data["guests"]) == (200, "2026-10-05", "Quiet room please", 1)
    assert bookings[8]["check_in"] == date(2026, 10, 5)
    assert await patch(8, {}) == (200, data)
