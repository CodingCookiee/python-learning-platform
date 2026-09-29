import hashlib
import hmac
import json

import fastapi  # noqa: F401  (imported here, untimed, so loading your service is quick)
import httpx
from plp import hidden, load_module, test

SECRET = "test-secret-shop"
NOW = 1773072000
REFUND = {"id": "evt_501", "type": "refund.created", "data": {"order": "SO-1042", "amount": "24.99"}}


def sign(body, timestamp=NOW, secret=SECRET):
    signature = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"


class Receiver:
    """Your app, with its queue and seen set, and a clock the test controls."""

    def __init__(self, now=NOW):
        self.now = now
        self.queue, self.seen = [], set()
        self.app = load_module("orders_webhook").create_app(
            secret=SECRET, clock=lambda: self.now, queue=self.queue, seen=self.seen
        )

    async def post(self, body, header="sign"):
        headers = {"Content-Type": "application/json"}
        if header == "sign":
            header = sign(body)
        if header is not None:
            headers["Webhook-Signature"] = header
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test") as client:
            return await client.post("/webhooks/orders", content=body, headers=headers)


def body(event):
    return json.dumps(event, separators=(",", ":")).encode()


@test("Queues a new, correctly signed event with 202")
async def _():
    receiver = Receiver()
    response = await receiver.post(body(REFUND))
    assert (response.status_code, response.json()) == (202, {"status": "queued"})
    assert receiver.queue == [REFUND]


@test("A repeated delivery is acknowledged as a duplicate and not queued again")
async def _():
    receiver = Receiver()
    await receiver.post(body(REFUND))
    response = await receiver.post(body(REFUND))
    assert (response.status_code, response.json()) == (200, {"status": "duplicate"})
    assert len(receiver.queue) == 1


@test("A bad signature gets 401 and nothing is queued")
async def _():
    receiver = Receiver()
    assert (await receiver.post(body(REFUND), header=sign(body(REFUND), secret="wrong-secret"))).status_code == 401
    assert receiver.queue == [] and receiver.seen == set()


@test("A delivery replayed ten minutes later gets 401")
async def _():
    receiver = Receiver(now=NOW + 600)
    assert (await receiver.post(body(REFUND))).status_code == 401
    assert receiver.queue == []


@hidden("Missing or malformed signature headers get 401")
async def _():
    receiver = Receiver()
    assert (await receiver.post(body(REFUND), header=None)).status_code == 401
    assert (await receiver.post(body(REFUND), header="t=soon")).status_code == 401
    assert receiver.queue == []


@hidden("Signed bodies that aren't JSON, or have no id, get 400")
async def _():
    receiver = Receiver()
    assert (await receiver.post(b'{"id": "evt_')).status_code == 400
    assert (await receiver.post(body({"type": "refund.created"}))).status_code == 400
    assert (await receiver.post(body(["evt_1"]))).status_code == 400
    assert receiver.queue == [] and receiver.seen == set()


@hidden("Ids already in the seen set, from before a restart, are duplicates")
async def _():
    receiver = Receiver()
    receiver.seen.add("evt_501")
    assert (await receiver.post(body(REFUND))).json() == {"status": "duplicate"}
    assert receiver.queue == []


@hidden("Different events are all queued, in order")
async def _():
    receiver = Receiver()
    events = [{**REFUND, "id": f"evt_{n}"} for n in (601, 602, 603)]
    for event in events:
        await receiver.post(body(event))
    assert [e["id"] for e in receiver.queue] == ["evt_601", "evt_602", "evt_603"]
    assert receiver.seen == {"evt_601", "evt_602", "evt_603"}
