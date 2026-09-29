import httpx

from plp import hidden, source_avoids, test
from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


@test("GET /health, POST /health and GET /bookings")
async def _():
    async with client() as api:
        assert (await api.get("/health")).json() == {"status": "ok"}
        assert (await api.post("/health")).json() == {"detail": "Method Not Allowed"}
        assert (await api.get("/bookings")).json() == {"detail": "Not Found"}


@test("Each answer has the right status code")
async def _():
    async with client() as api:
        assert (await api.get("/health")).status_code == 200
        assert (await api.post("/health")).status_code == 405
        assert (await api.get("/bookings")).status_code == 404


@test("Responses are labelled as JSON, and a 405 says which method is allowed")
async def _():
    async with client() as api:
        ok = await api.get("/health")
        refused = await api.delete("/health")
    assert ok.headers.get("content-type") == "application/json"
    assert refused.headers.get("allow") == "GET"


@test("No framework is used")
def _():
    assert source_avoids(name="fastapi") and source_avoids(name="starlette"), (
        "Write the ASGI app by hand, without FastAPI or Starlette"
    )


@hidden("Query strings don't change the path, and every other path is a 404")
async def _():
    async with client() as api:
        assert (await api.get("/health?verbose=1")).json() == {"status": "ok"}
        assert (await api.get("/health/db")).status_code == 404
        assert (await api.put("/")).status_code == 404
