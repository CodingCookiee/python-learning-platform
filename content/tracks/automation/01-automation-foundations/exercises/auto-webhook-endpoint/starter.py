import hashlib
import hmac
import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse


class InvalidWebhook(ValueError):
    """The webhook failed verification; the message says why."""


def verify_webhook(secret, header, body, now, tolerance=300):
    """True if the header is well formed, fresh and correctly signed; else raise InvalidWebhook."""
    timestamp, signatures = None, []
    for item in header.split(","):
        key, _, value = item.strip().partition("=")
        if key == "t":
            timestamp = value
        elif key == "v1":
            signatures.append(value)
    try:
        timestamp = int(timestamp)
    except (TypeError, ValueError):
        raise InvalidWebhook("malformed signature header") from None
    if not signatures:
        raise InvalidWebhook("malformed signature header")
    if abs(now - timestamp) > tolerance:
        raise InvalidWebhook("timestamp outside tolerance")
    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, candidate) for candidate in signatures):
        raise InvalidWebhook("signature mismatch")
    return True


def create_app(*, secret, clock, queue, seen):
    """A FastAPI app with POST /webhooks/orders: verify, deduplicate, queue, acknowledge."""
    app = FastAPI()

    @app.post("/webhooks/orders")
    async def order_event(request: Request):
        ...

    return app
