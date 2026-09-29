from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

app = FastAPI()

bookings: dict[str, dict] = {
    "B-1001": {"id": "B-1001", "tour": "Harbour kayak", "starts_at": datetime(2026, 10, 10, 9, 0, tzinfo=UTC), "status": "confirmed"},
}


def get_now() -> datetime:
    return datetime.now(UTC)


type Now = Annotated[datetime, Depends(get_now)]


def find_booking(booking_id: str) -> dict:
    if booking_id not in bookings:
        raise HTTPException(404, f"Booking {booking_id} not found")
    return bookings[booking_id]


@app.get("/bookings/{booking_id}/refund")
def refund_quote(booking_id: str, now: Now):
    booking = find_booking(booking_id)
    notice = booking["starts_at"] - now
    if notice >= timedelta(days=7):
        percent = 100
    elif notice >= timedelta(hours=48):
        percent = 50
    else:
        percent = 0
    return {"booking_id": booking_id, "refund_percent": percent}


@app.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str, now: Now):
    booking = find_booking(booking_id)
    if booking["starts_at"] - now < timedelta(hours=48):
        raise HTTPException(409, "Tours can't be cancelled online less than 48 hours before they start")
    booking["status"] = "cancelled"
    return booking
