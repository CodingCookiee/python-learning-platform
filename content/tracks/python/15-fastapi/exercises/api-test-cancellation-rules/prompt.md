Here is the tour-booking service after last drill's refactor, with its storage moved into a
dependency too:

```python
# tours.py
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

app = FastAPI()
BOOKINGS: dict[str, dict] = {}   # loaded from the database in production


def get_bookings() -> dict[str, dict]:
    return BOOKINGS


def get_now() -> datetime:
    return datetime.now(UTC)


type Bookings = Annotated[dict[str, dict], Depends(get_bookings)]
type Now = Annotated[datetime, Depends(get_now)]


def find_booking(bookings: dict, booking_id: str) -> dict:
    if booking_id not in bookings:
        raise HTTPException(404, f"Booking {booking_id} not found")
    return bookings[booking_id]


@app.get("/bookings/{booking_id}")
def get_booking(booking_id: str, bookings: Bookings):
    return find_booking(bookings, booking_id)


@app.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str, bookings: Bookings, now: Now):
    """Cancel a booking, unless the tour starts less than 48 hours from now (409)."""
    booking = find_booking(bookings, booking_id)
    if booking["starts_at"] - now < timedelta(hours=48):
        raise HTTPException(409, "Too late to cancel online")
    booking["status"] = "cancelled"
    return booking
```

Write `test_tours.py` with pytest. The starter sets up the fixtures: a fresh `bookings` dict for
each test, handed to the app by overriding `get_bookings`, and an `AsyncClient` over
`ASGITransport`. Pin the time by overriding `get_now` in each test.

Your tests must pass on this code, and catch the bugs planted in copies of it. Think about the
boundary, what happens after a successful cancellation, and bookings that don't exist.
