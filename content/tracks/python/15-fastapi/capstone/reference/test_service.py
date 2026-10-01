import json
from datetime import UTC, datetime

import httpx
import pytest

from service import Settings, create_app, get_now, sign_webhook

NOW = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)
SECRET = "whsec_test"
KEY = {"X-API-Key": "tw_test_key"}
BOOKING = {"customer_email": "ada@example.com", "tour": "island-ferry", "tour_date": "2026-10-12", "party_size": 2}

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def settings():
    return Settings(api_keys=["tw_test_key"], webhook_secret=SECRET)


@pytest.fixture
def app(settings):
    app = create_app(settings)
    app.dependency_overrides[get_now] = lambda: NOW
    return app


@pytest.fixture
async def client(app):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def deliver(client, event, secret=SECRET, timestamp=None):
    """POST an event to the webhook, signed as Paygate would sign it."""
    body = json.dumps(event).encode()
    signature = sign_webhook(body, secret, int(NOW.timestamp()) if timestamp is None else timestamp)
    return await client.post("/webhooks/paygate", content=body, headers={"Paygate-Signature": signature})


def payment(booking_id=1, amount_cents=4400, event_id="evt_1", kind="payment.succeeded"):
    return {"id": event_id, "type": kind, "created": int(NOW.timestamp()),
            "data": {"booking_id": booking_id, "amount_cents": amount_cents}}


async def book(client, **changes):
    response = await client.post("/bookings", json={**BOOKING, **changes}, headers=KEY)
    assert response.status_code == 201
    return response.json()


async def status_of(client, booking_id=1):
    return (await client.get(f"/bookings/{booking_id}", headers=KEY)).json()["status"]


async def test_create_booking_sets_price_and_status(client):
    booking = await book(client)
    assert booking == {**BOOKING, "id": 1, "amount_cents": 4400, "status": "pending"}


async def test_client_cannot_send_its_own_price(client):
    response = await client.post("/bookings", json={**BOOKING, "amount_cents": 1}, headers=KEY)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_failed"


async def test_missing_key_is_401_with_error_shape(client):
    response = await client.post("/bookings", json=BOOKING)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "ApiKey"
    assert response.json() == {"error": {"code": "unauthorized", "message": "Missing or invalid API key"}}


async def test_wrong_key_is_401(client):
    response = await client.get("/bookings", headers={"X-API-Key": "nope"})
    assert response.status_code == 401


async def test_missing_booking_is_404(client):
    response = await client.get("/bookings/99", headers=KEY)
    assert response.status_code == 404
    assert response.json() == {"error": {"code": "not_found", "message": "Booking 99 not found"}}


async def test_patch_recalculates_amount(client):
    await book(client)
    response = await client.patch("/bookings/1", json={"party_size": 5}, headers=KEY)
    assert response.json()["amount_cents"] == 11000


async def test_paid_booking_cannot_be_patched_or_cancelled(client):
    await book(client)
    await deliver(client, payment())
    patched = await client.patch("/bookings/1", json={"party_size": 3}, headers=KEY)
    cancelled = await client.delete("/bookings/1", headers=KEY)
    assert (patched.status_code, cancelled.status_code) == (409, 409)
    assert await status_of(client) == "paid"


async def test_cancel_sets_status(client):
    await book(client)
    response = await client.delete("/bookings/1", headers=KEY)
    assert response.status_code == 204
    assert await status_of(client) == "cancelled"


async def test_list_filters_by_status_and_pages(client):
    for size in (1, 2, 3):
        await book(client, party_size=size)
    await client.delete("/bookings/2", headers=KEY)
    pending = (await client.get("/bookings", params={"status": "pending"}, headers=KEY)).json()
    page = (await client.get("/bookings", params={"offset": 1, "limit": 1}, headers=KEY)).json()
    assert [b["id"] for b in pending] == [1, 3]
    assert [b["id"] for b in page] == [2]


async def test_valid_payment_marks_booking_paid(client):
    await book(client)
    response = await deliver(client, payment())
    assert response.json() == {"status": "processed"}
    assert await status_of(client) == "paid"


async def test_forged_signature_is_refused(client):
    await book(client)
    response = await deliver(client, payment(), secret="wrong")
    assert response.json()["error"]["code"] == "invalid_signature"
    assert await status_of(client) == "pending"


async def test_tampered_body_is_refused(client):
    await book(client)
    body = json.dumps(payment()).encode()
    signature = sign_webhook(body, SECRET, int(NOW.timestamp()))
    response = await client.post("/webhooks/paygate", content=body.replace(b"4400", b"9999"),
                                 headers={"Paygate-Signature": signature})
    assert response.status_code == 400
    assert await status_of(client) == "pending"


async def test_stale_timestamp_is_refused(client):
    await book(client)
    response = await deliver(client, payment(), timestamp=int(NOW.timestamp()) - 301)
    assert response.json()["error"]["code"] == "stale_signature"
    assert await status_of(client) == "pending"


async def test_repeated_event_is_not_applied_twice(client):
    await book(client)
    await deliver(client, payment())
    await deliver(client, payment(event_id="evt_2", kind="payment.refunded"))
    again = await deliver(client, payment())
    assert again.json() == {"status": "duplicate"}
    assert await status_of(client) == "refunded"


async def test_wrong_amount_flags_booking(client):
    await book(client)
    response = await deliver(client, payment(amount_cents=100))
    assert response.json() == {"status": "needs_review"}
    assert await status_of(client) == "needs_review"


async def test_unknown_event_type_is_ignored(client):
    await book(client)
    response = await deliver(client, payment(kind="customer.created"))
    assert response.json() == {"status": "ignored"}
    assert await status_of(client) == "pending"


async def test_two_apps_do_not_share_bookings(client, settings):
    await book(client)
    other = httpx.AsyncClient(transport=httpx.ASGITransport(app=create_app(settings)), base_url="http://test")
    async with other:
        response = await other.get("/bookings/1", headers=KEY)
    assert response.status_code == 404
