from datetime import UTC, datetime, timedelta

import httpx
import pytest

from tours import app, get_bookings, get_now

STARTS_AT = datetime(2026, 10, 10, 9, 0, tzinfo=UTC)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def bookings():
    return {"B-1001": {"id": "B-1001", "tour": "Harbour kayak", "starts_at": STARTS_AT, "status": "confirmed"}}


@pytest.fixture
async def client(bookings):
    app.dependency_overrides[get_bookings] = lambda: bookings
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


def pin_clock(moment):
    app.dependency_overrides[get_now] = lambda: moment


@pytest.mark.anyio
async def test_can_cancel_three_days_before(client):
    pin_clock(STARTS_AT - timedelta(days=3))
    response = await client.post("/bookings/B-1001/cancel")
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


@pytest.mark.anyio
async def test_cannot_cancel_47_hours_before(client, bookings):
    pin_clock(STARTS_AT - timedelta(hours=47))
    response = await client.post("/bookings/B-1001/cancel")
    assert response.status_code == 409
    assert bookings["B-1001"]["status"] == "confirmed"


@pytest.mark.anyio
async def test_can_cancel_exactly_48_hours_before(client):
    pin_clock(STARTS_AT - timedelta(hours=48))
    response = await client.post("/bookings/B-1001/cancel")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_cancellation_is_saved(client):
    pin_clock(STARTS_AT - timedelta(days=3))
    await client.post("/bookings/B-1001/cancel")
    response = await client.get("/bookings/B-1001")
    assert response.json()["status"] == "cancelled"


@pytest.mark.anyio
async def test_unknown_booking_is_a_404(client):
    pin_clock(STARTS_AT - timedelta(days=3))
    response = await client.post("/bookings/B-9999/cancel")
    assert response.status_code == 404
