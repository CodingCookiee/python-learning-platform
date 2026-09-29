from itertools import count

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()
bookings: dict[int, dict] = {}
booking_ids = count(1)


class BookingCreate(BaseModel):
    guest_name: str
    room_number: int


@app.post("/bookings")
def create_booking(booking: BookingCreate):
    booking_id = next(booking_ids)
    bookings[booking_id] = {"id": booking_id, **booking.model_dump()}
    return bookings[booking_id]


@app.delete("/bookings/{booking_id}")
def cancel_booking(booking_id: int):
    del bookings[booking_id]
    return {"deleted": True}
