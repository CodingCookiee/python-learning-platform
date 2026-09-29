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


@pytest.mark.anyio
async def test_can_cancel_three_days_before(client):
    app.dependency_overrides[get_now] = lambda: STARTS_AT - timedelta(days=3)
    response = await client.post("/bookings/B-1001/cancel")
    assert response.status_code == 200


# Too late (47 hours before), exactly 48 hours before, that the cancellation is saved,
# and a booking that doesn't exist
