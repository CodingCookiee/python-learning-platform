import asyncio
import inspect

from plp import hidden, test
from solution import fetch_balances, get_balances

BALANCES = {"GB-OPS-01": 12500.0, "GB-PAY-02": 830.25, "EU-OPS-03": 4100.1}


class BankClient:
    """A fake async banking API that counts how many requests are in flight at once."""

    def __init__(self):
        self.in_flight = 0
        self.peak = 0

    async def balance(self, account):
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(0.01)
        finally:
            self.in_flight -= 1
        return BALANCES[account]


EXPECTED = {"balances": dict(BALANCES), "total": 17430.35}


@test("Sync callers get every balance and the total")
def _():
    assert get_balances(BankClient(), ["GB-OPS-01", "GB-PAY-02", "EU-OPS-03"]) == EXPECTED


@test("get_balances is a plain function, fetch_balances a coroutine function")
def _():
    assert not inspect.iscoroutinefunction(get_balances), "get_balances should be a plain def"
    assert inspect.iscoroutinefunction(fetch_balances), "fetch_balances should be an async def"


@test("Async callers can await fetch_balances, and it runs the requests together")
async def _():
    client = BankClient()
    assert await fetch_balances(client, ["GB-OPS-01", "GB-PAY-02", "EU-OPS-03"]) == EXPECTED
    assert client.peak == 3, f"at most {client.peak} request(s) were in flight at once"


@hidden("Keeps the order of the accounts")
def _():
    result = get_balances(BankClient(), ["EU-OPS-03", "GB-OPS-01"])
    assert list(result["balances"]) == ["EU-OPS-03", "GB-OPS-01"]
    assert result["total"] == 16600.1


@hidden("No accounts: an empty report")
def _():
    assert get_balances(BankClient(), []) == {"balances": {}, "total": 0}
