import httpx

from plp import hidden, test
from solution import app


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def search(**params):
    """GET /jobs with these query parameters; returns (count, list of job ids)."""
    async with client() as api:
        data = (await api.get("/jobs", params=params)).json()
    return data.get("count"), [job["id"] for job in data.get("jobs", [])]


async def status(**params):
    async with client() as api:
        return (await api.get("/jobs", params=params)).status_code


@test("The four examples from the prompt")
async def _():
    assert await search(q="backend", remote="true") == (2, [1, 3])
    assert await search(q="ENGINEER", limit=2) == (4, [1, 3])
    assert await search(min_salary=60000) == (2, [1, 3])
    assert await status(limit=0) == 422


@test("With no filters, every job comes back")
async def _():
    assert await search() == (5, [1, 2, 3, 4, 5])


@test("remote=false finds on-site jobs only")
async def _():
    assert await search(remote="false") == (2, [2, 4])


@test("Values outside the rules are refused")
async def _():
    assert await status(limit=51) == 422
    assert await status(min_salary=-1) == 422
    assert await status(remote="sometimes") == 422


@hidden("Filters combine, and a search can find nothing")
async def _():
    assert await search(q="engineer", remote="true", min_salary=50000) == (2, [1, 3])
    assert await search(q="designer") == (0, [])
    assert await search(limit=50) == (5, [1, 2, 3, 4, 5])
