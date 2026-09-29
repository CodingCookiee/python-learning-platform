import httpx

from plp import hidden, test
from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


@test("Rooms 204 and 1512, and a room that isn't a number")
async def _():
    async with client() as api:
        assert (await api.get("/rooms/204")).json() == {"room_number": 204, "floor": 2}
        assert (await api.get("/rooms/1512")).json() == {"room_number": 1512, "floor": 15}
        assert (await api.get("/rooms/suite")).status_code == 422


@test("The room number comes back as a number, not text")
async def _():
    async with client() as api:
        assert type((await api.get("/rooms/301")).json()["room_number"]) is int


@hidden("Ground-floor rooms and decimals")
async def _():
    async with client() as api:
        assert (await api.get("/rooms/12")).json() == {"room_number": 12, "floor": 0}
        assert (await api.get("/rooms/20.5")).status_code == 422
