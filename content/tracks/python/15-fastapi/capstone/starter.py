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


# Models: BookingCreate, BookingUpdate, BookingRead and WebhookEvent (see the brief)


# Webhook signatures


def sign_webhook(body: bytes, secret: str, timestamp: int) -> str:
    """The Paygate-Signature header value for body, exactly as Paygate computes it.
    Your tests and send_webhook.py use this to sign events; the service must check it."""
    digest = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


def verify_signature(body: bytes, header: str | None, secret: str, now: datetime, tolerance: int) -> None:
    """Raise if header isn't a valid, current Paygate signature of body (see the brief)."""
    ...


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


# require_api_key, pagination, and the two routers with their routes


def create_app(settings: Settings) -> FastAPI:
    """A complete, independent service: its own store, routers, middleware and error handlers."""
    ...


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
