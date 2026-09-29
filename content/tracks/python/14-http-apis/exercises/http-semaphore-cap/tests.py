import asyncio

import httpx

from plp import hidden, raises, test
from solution import fetch_profiles


class UserApi:
    """A fake user API that measures concurrency. Over max_in_flight, it answers 429."""

    def __init__(self, max_in_flight=5):
        self.max_in_flight = max_in_flight
        self.in_flight = 0
        self.peak = 0
        self.paths = []

    async def __call__(self, request):
        self.paths.append(request.url.path)
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            if self.in_flight > self.max_in_flight:
                return httpx.Response(429, json={"error": "too many requests"})
            await asyncio.sleep(0.01)
            user_id = request.url.path.rsplit("/", 1)[-1]
            if user_id == "u_missing":
                return httpx.Response(404, json={"error": "no such user"})
            return httpx.Response(200, json={"id": user_id, "name": f"User {user_id[2:]}"})
        finally:
            self.in_flight -= 1

    def client(self):
        return httpx.AsyncClient(transport=httpx.MockTransport(self), base_url="https://api.crm.example", timeout=10)


IDS = [f"u_{n}" for n in range(1, 13)]


@test("Fetches twelve profiles in order, five at a time")
async def _():
    api = UserApi()
    async with api.client() as client:
        profiles = await fetch_profiles(client, IDS, limit=5)
    assert api.peak == 5, "Use all five slots, and never more"
    assert [profile["id"] for profile in profiles] == IDS


@test("Respects a smaller limit")
async def _():
    api = UserApi()
    async with api.client() as client:
        await fetch_profiles(client, IDS, limit=2)
    assert api.peak == 2


@test("A limit of 1 is one at a time")
async def _():
    api = UserApi()
    async with api.client() as client:
        profiles = await fetch_profiles(client, IDS[:4], limit=1)
    assert api.peak == 1
    assert profiles[0] == {"id": "u_1", "name": "User 1"}
    assert api.paths == ["/v1/users/u_1", "/v1/users/u_2", "/v1/users/u_3", "/v1/users/u_4"]


@hidden("A failed request raises, and an empty list needs no requests")
async def _():
    api = UserApi()
    async with api.client() as client:
        with raises(httpx.HTTPStatusError, what="fetch_profiles(client, ['u_1', 'u_missing'])"):
            await fetch_profiles(client, ["u_1", "u_missing"])
        assert await fetch_profiles(client, []) == []


@hidden("Each call has its own limit")
async def _():
    api = UserApi(max_in_flight=100)
    async with api.client() as client:
        await asyncio.gather(fetch_profiles(client, IDS, limit=3), fetch_profiles(client, IDS, limit=3))
    assert api.peak == 6
