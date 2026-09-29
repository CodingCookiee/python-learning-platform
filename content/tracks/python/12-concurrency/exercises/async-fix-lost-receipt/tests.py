import asyncio

from plp import hidden, raises, test
from solution import checkout

ORDER = {"id": "A-1042", "total": 34.0, "email": "ada@example.com"}


class Payments:
    def __init__(self, declined=False):
        self.declined = declined

    async def charge(self, order_id, amount):
        await asyncio.sleep(0.01)
        if self.declined:
            raise ValueError(f"{order_id}: card declined")
        return {"order": order_id, "amount": amount, "charge_id": f"ch_{order_id}"}


class Mailer:
    """A fake mail service. Sending takes 20 ms; some addresses are rejected."""

    def __init__(self, rejected=()):
        self.rejected = set(rejected)
        self.sent = []

    async def send(self, address, receipt):
        await asyncio.sleep(0.02)
        if address in self.rejected:
            raise ConnectionRefusedError(f"550 {address}: mailbox unavailable")
        self.sent.append((address, receipt["charge_id"]))


@test("The receipt has been sent by the time checkout returns")
async def _():
    mailer = Mailer()
    assert await checkout(ORDER, Payments(), mailer) == {"order": "A-1042", "amount": 34.0, "charge_id": "ch_A-1042"}
    assert mailer.sent == [("ada@example.com", "ch_A-1042")]


@test("A rejected address makes checkout raise")
async def _():
    mailer = Mailer(rejected={"ada@example.com"})
    with raises(ConnectionRefusedError, match="mailbox unavailable", what="checkout(ORDER, Payments(), mailer)"):
        await checkout(ORDER, Payments(), mailer)


@test("No task is left running when checkout returns")
async def _():
    before = len(asyncio.all_tasks())
    await checkout(ORDER, Payments(), Mailer())
    assert len(asyncio.all_tasks()) <= before, "checkout left a background task running"


@hidden("A declined card sends no email")
async def _():
    mailer = Mailer()
    with raises(ValueError, match="declined", what="checkout(ORDER, Payments(declined=True), mailer)"):
        await checkout(ORDER, Payments(declined=True), mailer)
    await asyncio.sleep(0.03)
    assert mailer.sent == []
