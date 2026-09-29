import asyncio

from plp import hidden, raises, test
from solution import load_dashboard


class AccountAPI:
    """A fake async account API that counts how many requests are in flight at once."""

    def __init__(self, delay=0.05, failing=None):
        self.delay = delay
        self.failing = failing
        self.in_flight = 0
        self.peak = 0
        self.calls = []

    async def _request(self, endpoint, user_id, payload):
        self.calls.append(endpoint)
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(self.delay)
        finally:
            self.in_flight -= 1
        if endpoint == self.failing:
            raise ConnectionError(f"{endpoint}: 503 Service Unavailable")
        return payload

    async def profile(self, user_id):
        return await self._request("profile", user_id, {"id": user_id, "name": "Ada Lovelace"})

    async def orders(self, user_id):
        return await self._request("orders", user_id, [
            {"id": "A-1042", "status": "open"},
            {"id": "A-1043", "status": "shipped"},
            {"id": "A-1044", "status": "open"},
        ])

    async def alerts(self, user_id):
        return await self._request("alerts", user_id, [{"text": "Card expiring", "read": False}, {"text": "Welcome", "read": True}])


@test("Returns the same dashboard as before")
async def _():
    assert await load_dashboard(AccountAPI(), "u-17") == {"name": "Ada Lovelace", "open_orders": 2, "unread_alerts": 1}


@test("All three requests are in flight at once")
async def _():
    api = AccountAPI()
    await load_dashboard(api, "u-17")
    assert api.peak == 3, f"at most {api.peak} request(s) were in flight at the same time"


@test("Loads in the time of one request, not three")
async def _():
    api = AccountAPI(delay=0.1)
    loop = asyncio.get_running_loop()
    start = loop.time()
    await load_dashboard(api, "u-17")
    elapsed = loop.time() - start
    assert elapsed < 0.25, f"it took {elapsed:.2f} s; three requests of 0.1 s each should overlap"


@hidden("Makes each request exactly once")
async def _():
    api = AccountAPI()
    await load_dashboard(api, "u-17")
    assert sorted(api.calls) == ["alerts", "orders", "profile"]


@hidden("A failed request still raises")
async def _():
    api = AccountAPI(failing="orders")
    with raises(ConnectionError, match="503", what='load_dashboard(api, "u-17")'):
        await load_dashboard(api, "u-17")
    await asyncio.sleep(0.06)  # let any request still in flight finish
