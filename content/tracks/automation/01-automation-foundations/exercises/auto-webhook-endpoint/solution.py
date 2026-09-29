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

    @app.post("/webhooks/orders", status_code=202)
    async def order_event(request: Request):
        raw = await request.body()
        try:
            verify_webhook(secret, request.headers.get("webhook-signature", ""), raw, clock())
        except InvalidWebhook as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from None

        try:
            event = json.loads(raw)
        except ValueError:
            raise HTTPException(status_code=400, detail="body is not valid JSON") from None
        if not isinstance(event, dict) or "id" not in event:
            raise HTTPException(status_code=400, detail="event has no id")

        if event["id"] in seen:
            return JSONResponse({"status": "duplicate"}, status_code=200)
        queue.append(event)  # the slow work happens in a worker, not here
        seen.add(event["id"])
        return {"status": "queued"}

    return app
