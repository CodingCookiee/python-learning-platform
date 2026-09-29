import httpx

from plp import hidden, test
from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def openapi():
    async with client() as api:
        return (await api.get("/openapi.json")).json()


@test("Lists rooms, looks one up, and refuses a room number that isn't a number")
async def _():
    async with client() as api:
        assert (await api.get("/rooms")).json()[0] == {"number": 101, "kind": "single", "rate": 90}
        assert (await api.get("/rooms/204")).json() == {"number": 204, "kind": "suite", "rate": 240}
        assert (await api.get("/rooms/two")).status_code == 422


@test("The docs have the right title and version")
async def _():
    info = (await openapi())["info"]
    assert (info["title"], info["version"]) == ("Rooms API", "1.0.0")


@test("Both paths are documented with their summaries")
async def _():
    paths = (await openapi())["paths"]
    assert sorted(paths) == ["/rooms", "/rooms/{room_number}"]
    assert paths["/rooms"]["get"].get("summary") == "List rooms"
    assert paths["/rooms/{room_number}"]["get"].get("summary") == "Look up a room"


@test("room_number is an integer path parameter, and the lookup is described")
async def _():
    operation = (await openapi())["paths"]["/rooms/{room_number}"]["get"]
    parameter = operation["parameters"][0]
    assert (parameter["name"], parameter["in"], parameter["schema"].get("type")) == ("room_number", "path", "integer")
    assert operation.get("description") == "Returns one room by its number."


@hidden("Every room can be looked up, and the list keeps its order")
async def _():
    async with client() as api:
        assert [room["number"] for room in (await api.get("/rooms")).json()] == [101, 102, 204]
        assert (await api.get("/rooms/102")).json()["kind"] == "double"
