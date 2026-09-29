from datetime import date

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

ERROR_CODES = {400: "bad_request", 404: "not_found", 405: "method_not_allowed", 409: "conflict"}

app = FastAPI()
bookings: dict[int, dict] = {1: {"id": 1, "room_number": 101, "check_in": date(2026, 10, 1), "nights": 3}}
TAKEN = {(204, date(2026, 10, 1))}


class RoomUnavailable(Exception):
    def __init__(self, room_number: int, check_in: date):
        super().__init__(f"Room {room_number} is not available on {check_in.isoformat()}")


def reserve(room_number: int, check_in: date, nights: int) -> dict:
    """Business logic: raises RoomUnavailable if the room is taken that night."""
    if (room_number, check_in) in TAKEN:
        raise RoomUnavailable(room_number, check_in)
    booking = {"id": max(bookings) + 1, "room_number": room_number, "check_in": check_in, "nights": nights}
    bookings[booking["id"]] = booking
    return booking


class BookingCreate(BaseModel):
    room_number: int
    check_in: date
    nights: int = Field(ge=1, le=14)


@app.get("/bookings/{booking_id}")
def get_booking(booking_id: int):
    if booking_id not in bookings:
        raise HTTPException(status_code=404, detail=f"Booking {booking_id} not found")
    return bookings[booking_id]


@app.post("/bookings", status_code=201)
def create_booking(booking: BookingCreate):
    return reserve(booking.room_number, booking.check_in, booking.nights)


def error_response(status: int, code: str, message: str, headers=None, **extra) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, **extra}},
        headers=headers,
    )


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    code = ERROR_CODES.get(exc.status_code, "error")
    return error_response(exc.status_code, code, str(exc.detail), headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    fields = [
        {"field": ".".join(str(part) for part in problem["loc"]), "message": problem["msg"]}
        for problem in exc.errors()
    ]
    return error_response(422, "validation_failed", "The request is invalid", fields=fields)


@app.exception_handler(RoomUnavailable)
async def room_unavailable(request: Request, exc: RoomUnavailable):
    return error_response(409, "room_unavailable", str(exc))
