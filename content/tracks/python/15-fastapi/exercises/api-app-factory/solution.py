import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, SecretStr


class Settings(BaseModel):
    service_name: str = "Tidewater bookings"
    admin_key: SecretStr
    allowed_origins: list[str] = []
    max_party_size: int = Field(default=8, ge=1)


class BookingCreate(BaseModel):
    guest_name: str = Field(min_length=1)
    party_size: int = Field(ge=1)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_bookings(request: Request) -> list[dict]:
    return request.app.state.bookings


type SettingsDep = Annotated[Settings, Depends(get_settings)]
type BookingsDep = Annotated[list[dict], Depends(get_bookings)]


def require_admin(settings: SettingsDep, x_admin_key: Annotated[str | None, Header()] = None) -> None:
    expected = settings.admin_key.get_secret_value()
    if x_admin_key is None or not secrets.compare_digest(x_admin_key, expected):
        raise HTTPException(401, "Admin key required")


bookings_router = APIRouter(prefix="/bookings", tags=["bookings"])
admin_router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@bookings_router.post("", status_code=201)
def create_booking(booking: BookingCreate, settings: SettingsDep, bookings: BookingsDep):
    if booking.party_size > settings.max_party_size:
        raise HTTPException(422, f"Party size is limited to {settings.max_party_size}")
    record = {"id": len(bookings) + 1, **booking.model_dump()}
    bookings.append(record)
    return record


@bookings_router.get("")
def list_bookings(bookings: BookingsDep):
    return bookings


@admin_router.get("/stats")
def stats(bookings: BookingsDep):
    return {"bookings": len(bookings), "guests": sum(booking["party_size"] for booking in bookings)}


def create_app(settings: Settings) -> FastAPI:
    """A complete, independent booking app for one brand."""
    app = FastAPI(title=settings.service_name)
    app.state.settings = settings
    app.state.bookings = []
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Admin-Key"],
    )
    app.include_router(bookings_router)
    app.include_router(admin_router)
    return app
