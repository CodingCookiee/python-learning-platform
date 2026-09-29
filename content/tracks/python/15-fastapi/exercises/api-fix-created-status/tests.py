import httpx

from plp import hidden, test
from solution import app, bookings


def client():
    # raise_app_exceptions=False: a crash in the app comes back as a 500, as a real client would see it
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


async def create(guest_name="Ada", room_number=204):
    async with client() as api:
        return await api.post("/bookings", json={"guest_name": guest_name, "room_number": room_number})


@test("Create answers 201, cancel answers 204, and an unknown booking answers 404")
async def _():
    created = await create()
    booking_id = created.json()["id"]
    assert created.status_code == 201
    assert created.json() == {"id": booking_id, "guest_name": "Ada", "room_number": 204}
    async with client() as api:
        assert (await api.delete(f"/bookings/{booking_id}")).status_code == 204
        assert (await api.delete("/bookings/99")).status_code == 404


@test("A 204 has an empty body, and the booking is really gone")
async def _():
    booking_id = (await create("Grace", 101)).json()["id"]
    async with client() as api:
        response = await api.delete(f"/bookings/{booking_id}")
    assert response.content == b""
    assert booking_id not in bookings


@test("The 404 names the booking")
async def _():
    async with client() as api:
        assert (await api.delete("/bookings/99")).json() == {"detail": "Booking 99 not found"}


@hidden("Cancelling twice gives 204 and then 404")
async def _():
    booking_id = (await create("Katherine", 312)).json()["id"]
    async with client() as api:
        first = await api.delete(f"/bookings/{booking_id}")
        second = await api.delete(f"/bookings/{booking_id}")
    assert (first.status_code, second.status_code) == (204, 404)
    assert second.json() == {"detail": f"Booking {booking_id} not found"}
