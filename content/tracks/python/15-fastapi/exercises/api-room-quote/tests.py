import httpx

from plp import hidden, test
from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def quote(path):
    async with client() as api:
        return (await api.get(path)).json()


async def status_of(path):
    async with client() as api:
        return (await api.get(path)).status_code


@test("Three nights in room 204 with breakfast and a late check-out")
async def _():
    assert await quote("/rooms/204/quote?check_in=2026-10-01&nights=3&extra=late-checkout&extra=breakfast") == {
        "room_number": 204,
        "check_in": "2026-10-01",
        "check_out": "2026-10-04",
        "nights": 3,
        "extras": ["breakfast", "late-checkout"],
        "total": 465,
    }


@test("One night, no extras, by default")
async def _():
    assert await quote("/rooms/101/quote?check_in=2026-12-31") == {
        "room_number": 101,
        "check_in": "2026-12-31",
        "check_out": "2027-01-01",
        "nights": 1,
        "extras": [],
        "total": 90,
    }


@test("Bad values are refused with 422")
async def _():
    assert await status_of("/rooms/204/quote") == 422
    assert await status_of("/rooms/204/quote?check_in=01/10/2026") == 422
    assert await status_of("/rooms/204/quote?check_in=2026-10-01&nights=0") == 422
    assert await status_of("/rooms/204/quote?check_in=2026-10-01&nights=15") == 422
    assert await status_of("/rooms/204/quote?check_in=2026-10-01&extra=spa") == 422


@test("Room numbers outside 100 to 399 are refused")
async def _():
    assert await status_of("/rooms/99/quote?check_in=2026-10-01") == 422
    assert await status_of("/rooms/400/quote?check_in=2026-10-01") == 422


@hidden("A repeated extra counts once, and per-night extras scale with the stay")
async def _():
    data = await quote("/rooms/312/quote?check_in=2026-10-01&nights=14&extra=parking&extra=parking&extra=breakfast")
    assert data["extras"] == ["breakfast", "parking"]
    assert data["total"] == 240 * 14 + 12 * 14 + 15 * 14
    assert data["check_out"] == "2026-10-15"
