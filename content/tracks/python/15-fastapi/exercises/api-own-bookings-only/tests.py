import httpx

from plp import hidden, test
from solution import app, bookings

ADA, GRACE, DESK = "key_ada_3f9e", "key_grace_81c2", "key_desk_0d7a"


def client():
    # A crash in the app comes back as a 500, as a real client would see it
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


def reset():
    bookings.clear()
    bookings["B-1"] = {"id": "B-1", "customer_id": "cus_ada", "tour": "Harbour kayak"}
    bookings["B-2"] = {"id": "B-2", "customer_id": "cus_grace", "tour": "Island ferry"}
    bookings["B-3"] = {"id": "B-3", "customer_id": "cus_ada", "tour": "Lighthouse walk"}


async def send(method, path, key):
    async with client() as api:
        response = await api.request(method, path, headers={"X-API-Key": key})
    try:
        return response.status_code, response.json()
    except ValueError:
        return response.status_code, response.text


@test("The four examples from the prompt")
async def _():
    reset()
    status, body = await send("GET", "/bookings", ADA)
    assert (status, [booking["id"] for booking in body]) == (200, ["B-1", "B-3"])
    assert await send("GET", "/bookings/B-2", ADA) == (404, {"detail": "Booking B-2 not found"})
    assert await send("GET", "/bookings/B-2", DESK) == (200, bookings["B-2"])
    assert await send("DELETE", "/bookings/B-1", ADA) == (403, {"detail": "Only staff can delete bookings"})


@test("Staff see every booking; Grace sees only hers")
async def _():
    reset()
    status, body = await send("GET", "/bookings", DESK)
    assert [booking["id"] for booking in body] == ["B-1", "B-2", "B-3"]
    status, body = await send("GET", "/bookings", GRACE)
    assert [booking["id"] for booking in body] == ["B-2"]


@test("Someone else's booking looks exactly like a missing one")
async def _():
    reset()
    assert await send("GET", "/bookings/B-1", GRACE) == (404, {"detail": "Booking B-1 not found"})
    assert await send("GET", "/bookings/B-9", GRACE) == (404, {"detail": "Booking B-9 not found"})
    assert (await send("GET", "/bookings/B-1", ADA))[0] == 200


@test("Staff can delete; customers can't, even their own")
async def _():
    reset()
    assert (await send("DELETE", "/bookings/B-3", ADA))[0] == 403
    assert "B-3" in bookings
    assert (await send("DELETE", "/bookings/B-3", DESK))[0] == 204
    assert "B-3" not in bookings


@hidden("Deleting a missing booking is a 404, and no key is a 401")
async def _():
    reset()
    assert await send("DELETE", "/bookings/B-9", DESK) == (404, {"detail": "Booking B-9 not found"})
    assert await send("DELETE", "/bookings/B-9", GRACE) == (403, {"detail": "Only staff can delete bookings"})
    assert (await send("GET", "/bookings", "key_nobody"))[0] == 401
