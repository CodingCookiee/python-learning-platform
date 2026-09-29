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


class BookingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    guests: int | None = Field(default=None, ge=1, le=6)
    check_in: date | None = None
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("guests", "check_in")
    @classmethod
    def not_null(cls, value):
        if value is None:
            raise ValueError("can't be null")
        return value


@app.patch("/bookings/{booking_id}", response_model=BookingRead)
def update_booking(booking_id: int, update: BookingUpdate):
    bookings[booking_id] |= update.model_dump(exclude_unset=True)
    return bookings[booking_id]
