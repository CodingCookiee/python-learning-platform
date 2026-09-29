from datetime import date

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field, field_validator

app = FastAPI()

bookings: dict[int, dict] = {
    7: {"id": 7, "guest_name": "Ada Lovelace", "guests": 2, "check_in": date(2026, 10, 1), "notes": "Late arrival"},
    8: {"id": 8, "guest_name": "Grace Hopper", "guests": 1, "check_in": date(2026, 10, 3), "notes": None},
}


class BookingRead(BaseModel):
    id: int
    guest_name: str
    guests: int
    check_in: date
    notes: str | None


# BookingUpdate model


@app.patch("/bookings/{booking_id}")
def update_booking(booking_id: int):
    ...
