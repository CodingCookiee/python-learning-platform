"""Tidewater Tours booking service: bookings behind API keys, and a signed Paygate webhook.

Run the demo:      python service.py
Run the server:    uv run uvicorn service:app_from_env --factory --reload
Run the tests:     uv run pytest
"""

import asyncio
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import uuid
from collections.abc import Mapping
from datetime import UTC, date, datetime
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, SecretStr, ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Settings (written for you)


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    service_name: str = "Tidewater bookings"
    api_keys: list[SecretStr] = Field(min_length=1)
    webhook_secret: SecretStr
    signature_tolerance_seconds: int = Field(default=300, ge=1)


def load_settings(environ: Mapping[str, str]) -> Settings:
    """Settings from TIDEWATER_API_KEYS (comma-separated) and TIDEWATER_WEBHOOK_SECRET."""
    return Settings(
        api_keys=[key.strip() for key in environ.get("TIDEWATER_API_KEYS", "").split(",") if key.strip()],
        webhook_secret=environ.get("TIDEWATER_WEBHOOK_SECRET", ""),
    )


# Prices and the vocabulary (written for you)

TOUR_PRICES = {"harbour-kayak": 4500, "island-ferry": 2200, "lighthouse-walk": 1500}  # cents per person

type Tour = Literal["harbour-kayak", "island-ferry", "lighthouse-walk"]
type Status = Literal["pending", "paid", "needs_review", "refunded", "cancelled"]


# Models

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class BookingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_email: str = Field(pattern=EMAIL_PATTERN)
    tour: Tour
    tour_date: date
    party_size: int = Field(ge=1, le=12)


class BookingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tour_date: date | None = None
    party_size: int | None = Field(default=None, ge=1, le=12)


class BookingRead(BaseModel):
    id: int
    customer_email: str
    tour: Tour
    tour_date: date
    party_size: int
    amount_cents: int
    status: Status


class WebhookEvent(BaseModel):
    id: str
    type: str
    created: int
    data: dict


# Webhook signatures


def sign_webhook(body: bytes, secret: str, timestamp: int) -> str:
    """The Paygate-Signature header value for body, exactly as Paygate computes it.
    Your tests and send_webhook.py use this to sign events; the service must check it."""
    digest = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


SIGNATURE = re.compile(r"t=(\d+),v1=([0-9a-f]{64})")


class SignatureError(Exception):
    """A webhook whose signature is missing, wrong or out of date."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def verify_signature(body: bytes, header: str | None, secret: str, now: datetime, tolerance: int) -> None:
    """Raise if header isn't a valid, current Paygate signature of body (see the brief)."""
    match = SIGNATURE.fullmatch(header or "")
    if match is None:
        raise SignatureError("invalid_signature", "Missing or malformed Paygate-Signature header")
    timestamp, given = int(match[1]), match[2]
    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(given, expected):
        raise SignatureError("invalid_signature", "Signature doesn't match")
    if abs(now.timestamp() - timestamp) > tolerance:
        raise SignatureError("stale_signature", "Signature timestamp is outside the tolerance")


# Storage (written for you): module 16 replaces it with a database


class Store:
    def __init__(self):
        self.bookings: dict[int, dict] = {}
        self.processed_events: set[str] = set()
        self._next_id = 1

    def add(self, booking: dict) -> dict:
        """Store a new booking, giving it the next id, and return it."""
        booking = {"id": self._next_id, **booking}
        self.bookings[booking["id"]] = booking
        self._next_id += 1
        return booking


# Dependencies


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_store(request: Request) -> Store:
    return request.app.state.store


def get_now() -> datetime:
    return datetime.now(UTC)


def require_api_key(
    settings: Annotated[Settings, Depends(get_settings)],
    x_api_key: Annotated[str | None, Header()] = None,
) -> None:
    given = (x_api_key or "").encode()
    if not x_api_key or not any(secrets.compare_digest(given, key.get_secret_value().encode()) for key in settings.api_keys):
        raise HTTPException(401, "Missing or invalid API key", headers={"WWW-Authenticate": "ApiKey"})


def pagination(
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> tuple[int, int]:
    return offset, limit


def find_booking(store: Store, booking_id: int) -> dict:
    booking = store.bookings.get(booking_id)
    if booking is None:
        raise HTTPException(404, f"Booking {booking_id} not found")
    return booking


bookings = APIRouter(prefix="/bookings", tags=["bookings"], dependencies=[Depends(require_api_key)])


@bookings.post("", status_code=201, response_model=BookingRead)
def create_booking(body: BookingCreate, store: Annotated[Store, Depends(get_store)]) -> dict:
    return store.add({
        **body.model_dump(),
        "amount_cents": TOUR_PRICES[body.tour] * body.party_size,
        "status": "pending",
    })


@bookings.get("", response_model=list[BookingRead])
def list_bookings(
    store: Annotated[Store, Depends(get_store)],
    page: Annotated[tuple[int, int], Depends(pagination)],
    status: Status | None = None,
) -> list[dict]:
    offset, limit = page
    found = [b for b in store.bookings.values() if status is None or b["status"] == status]
    return found[offset : offset + limit]


@bookings.get("/{booking_id}", response_model=BookingRead)
def get_booking(booking_id: int, store: Annotated[Store, Depends(get_store)]) -> dict:
    return find_booking(store, booking_id)


@bookings.patch("/{booking_id}", response_model=BookingRead)
def update_booking(booking_id: int, body: BookingUpdate, store: Annotated[Store, Depends(get_store)]) -> dict:
    booking = find_booking(store, booking_id)
    if booking["status"] != "pending":
        raise HTTPException(409, f"Booking {booking_id} is {booking['status']} and can't be changed")
    booking.update(body.model_dump(exclude_unset=True, exclude_none=True))
    booking["amount_cents"] = TOUR_PRICES[booking["tour"]] * booking["party_size"]
    return booking


@bookings.delete("/{booking_id}", status_code=204)
def cancel_booking(booking_id: int, store: Annotated[Store, Depends(get_store)]) -> None:
    booking = find_booking(store, booking_id)
    if booking["status"] == "paid":
        raise HTTPException(409, f"Booking {booking_id} is paid; refund it through Paygate first")
    booking["status"] = "cancelled"


webhooks = APIRouter(tags=["webhooks"])


@webhooks.post("/webhooks/paygate")
async def paygate_webhook(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    store: Annotated[Store, Depends(get_store)],
    now: Annotated[datetime, Depends(get_now)],
) -> dict:
    body = await request.body()
    verify_signature(
        body,
        request.headers.get("Paygate-Signature"),
        settings.webhook_secret.get_secret_value(),
        now,
        settings.signature_tolerance_seconds,
    )
    try:
        event = WebhookEvent.model_validate_json(body)
    except ValidationError:
        raise HTTPException(400, "The body isn't a valid Paygate event") from None
    if event.id in store.processed_events:
        return {"status": "duplicate"}
    store.processed_events.add(event.id)
    return {"status": apply_event(event, store)}


def apply_event(event: WebhookEvent, store: Store) -> str:
    """Apply a new, verified event to its booking, and say what happened."""
    booking_id = event.data.get("booking_id")
    booking = store.bookings.get(booking_id) if isinstance(booking_id, int) else None
    if booking is None:
        return "ignored"
    if event.type == "payment.succeeded":
        if booking["status"] == "pending" and event.data.get("amount_cents") == booking["amount_cents"]:
            booking["status"] = "paid"
            return "processed"
        booking["status"] = "needs_review"
        return "needs_review"
    if event.type == "payment.refunded":
        booking["status"] = "refunded"
        return "processed"
    return "ignored"


# Errors and request ids

ERROR_CODES = {400: "bad_request", 401: "unauthorized", 404: "not_found", 405: "method_not_allowed", 409: "conflict"}
REQUEST_ID = re.compile(r"[A-Za-z0-9-]{8,64}")


def error(status: int, code: str, message: str, headers: Mapping[str, str] | None = None, **extra) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, **extra}}, headers=headers)


async def http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return error(exc.status_code, ERROR_CODES.get(exc.status_code, "error"), str(exc.detail), headers=exc.headers)


async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    fields = [
        {"field": ".".join(str(part) for part in problem["loc"]), "message": problem["msg"]}
        for problem in exc.errors()
    ]
    return error(422, "validation_failed", "The request is invalid", fields=fields)


async def signature_error(request: Request, exc: SignatureError) -> JSONResponse:
    return error(400, exc.code, exc.message)


async def request_id(request: Request, call_next):
    given = request.headers.get("X-Request-ID", "")
    rid = given if REQUEST_ID.fullmatch(given) else uuid.uuid4().hex
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


def create_app(settings: Settings) -> FastAPI:
    """A complete, independent service: its own store, routers, middleware and error handlers."""
    app = FastAPI(title=settings.service_name)
    app.state.settings = settings
    app.state.store = Store()
    app.include_router(bookings)
    app.include_router(webhooks)
    app.add_exception_handler(StarletteHTTPException, http_error)
    app.add_exception_handler(RequestValidationError, validation_error)
    app.add_exception_handler(SignatureError, signature_error)
    app.middleware("http")(request_id)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    return app


def app_from_env() -> FastAPI:
    """For uvicorn: uv run uvicorn service:app_from_env --factory --reload"""
    return create_app(load_settings(os.environ))


# A demo that runs anywhere, with no server: python service.py

DEMO_SETTINGS = Settings(api_keys=["tw_live_desk_4c1e"], webhook_secret="whsec_demo_9f27")


def demo() -> None:
    app = create_app(DEMO_SETTINGS)
    key = {"X-API-Key": "tw_live_desk_4c1e"}

    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            async def show(label, response):
                body = response.json() if response.content else ""
                print(f"{label:<34} {response.status_code} {json.dumps(body)}")

            booking = {"customer_email": "ada@example.com", "tour": "harbour-kayak", "tour_date": "2026-10-10", "party_size": 2}
            await show("POST /bookings", await client.post("/bookings", json=booking, headers=key))
            await show("POST /bookings (no key)", await client.post("/bookings", json=booking))
            await show("PATCH /bookings/1", await client.patch("/bookings/1", json={"party_size": 3}, headers=key))

            event = {"id": "evt_1001", "type": "payment.succeeded", "created": int(time.time()),
                     "data": {"booking_id": 1, "amount_cents": 13500, "payment_id": "pay_77"}}
            body = json.dumps(event).encode()
            signed = {"Paygate-Signature": sign_webhook(body, "whsec_demo_9f27", int(time.time())),
                      "Content-Type": "application/json"}
            await show("POST /webhooks/paygate", await client.post("/webhooks/paygate", content=body, headers=signed))
            await show("POST /webhooks/paygate (again)", await client.post("/webhooks/paygate", content=body, headers=signed))
            forged = {**signed, "Paygate-Signature": sign_webhook(body, "wrong-secret", int(time.time()))}
            await show("POST /webhooks/paygate (forged)", await client.post("/webhooks/paygate", content=body, headers=forged))
            await show("GET /bookings/1", await client.get("/bookings/1", headers=key))
            await show("DELETE /bookings/1", await client.delete("/bookings/1", headers=key))

    asyncio.run(run())


if __name__ == "__main__":
    demo()
