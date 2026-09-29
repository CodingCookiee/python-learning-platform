Tidewater Tours runs harbour kayak trips, an island ferry and guided lighthouse walks. Bookings come
in from the website, the front desk and two partner hotels, and payments go through **Paygate**, a
Stripe-like payment provider. Today someone checks the Paygate dashboard every evening and marks
bookings as paid in a spreadsheet by hand. You're building the service that replaces that: a
booking API the website and partners call with API keys, and a **webhook** endpoint that Paygate
calls the moment a payment succeeds or is refunded.

Webhooks are the part to get exactly right. The endpoint is public, so anyone on the internet can
post to it. It must prove each event really came from Paygate, refuse an old event replayed by an
attacker, and apply an event only once, however many times Paygate retries it. Keep this project:
the automation track (A1) builds on it, adding retries, a job queue and n8n workflows that call it.

You'll build one module, `service.py`, and a test suite, `test_service.py`. The starter has the
settings, the prices, the signing function Paygate uses, a small in-memory store and a demo.

## A sample run

`python service.py` runs the demo: requests sent in-process over `ASGITransport`, no server
needed. Once your service is complete, it prints:

```text
POST /bookings                     201 {"id": 1, "customer_email": "ada@example.com", "tour": "harbour-kayak", "tour_date": "2026-10-10", "party_size": 2, "amount_cents": 9000, "status": "pending"}
POST /bookings (no key)            401 {"error": {"code": "unauthorized", "message": "Missing or invalid API key"}}
PATCH /bookings/1                  200 {"id": 1, "customer_email": "ada@example.com", "tour": "harbour-kayak", "tour_date": "2026-10-10", "party_size": 3, "amount_cents": 13500, "status": "pending"}
POST /webhooks/paygate             200 {"status": "processed"}
POST /webhooks/paygate (again)     200 {"status": "duplicate"}
POST /webhooks/paygate (forged)    400 {"error": {"code": "invalid_signature", "message": "Signature doesn't match"}}
GET /bookings/1                    200 {"id": 1, "customer_email": "ada@example.com", "tour": "harbour-kayak", "tour_date": "2026-10-10", "party_size": 3, "amount_cents": 13500, "status": "paid"}
DELETE /bookings/1                 409 {"error": {"code": "conflict", "message": "Booking 1 is paid; refund it through Paygate first"}}
```

## The design

| Piece | Kind | Job |
|-------|------|-----|
| `Settings`, `load_settings` | Pydantic model (given) | API keys, the webhook secret, the signature tolerance |
| `BookingCreate`, `BookingUpdate`, `BookingRead` | Pydantic models | What a client may send, may change, and sees |
| `WebhookEvent` | Pydantic model | The shape of a Paygate event |
| `sign_webhook` | function (given) | How Paygate signs an event |
| `verify_signature` | function | Checks a signature, or raises |
| `Store` | class (given) | Bookings and processed event ids, for one app |
| `require_api_key`, `pagination`, `get_now` | dependencies | Auth, paging, and a clock tests can pin |
| `bookings`, `webhooks` | `APIRouter`s | The routes, grouped |
| `create_app(settings)` | app factory | Builds one complete, independent app |

Everything an app needs lives on `app.state` (`settings` and `store`), and the `get_settings` and
`get_store` dependencies reach it through the request. That's what lets every test build its own
fresh app.

## Requirements

### Bookings

`BookingCreate` is the body of a new booking. Unknown fields are refused (`extra="forbid"`), so a
client can't send an id, a price or a status:

| Field | Rules |
|-------|-------|
| `customer_email` | text shaped like an email: something, `@`, something, a dot, something |
| `tour` | a `Tour` |
| `tour_date` | a date |
| `party_size` | 1 to 12 |

`BookingRead` is every booking response: `id`, `customer_email`, `tour`, `tour_date`,
`party_size`, `amount_cents` and `status`. `BookingUpdate` has `tour_date` and `party_size`, both
optional, and also forbids anything else.

| Request | Does | Status |
|---------|------|--------|
| `POST /bookings` | Creates a `pending` booking; `amount_cents` is `TOUR_PRICES[tour] * party_size` | `201` |
| `GET /bookings` | Lists bookings, oldest first. Optional `status` filter; `offset` (0 or more, default 0) and `limit` (1 to 100, default 20) | `200` |
| `GET /bookings/{booking_id}` | One booking | `200` or `404` |
| `PATCH /bookings/{booking_id}` | Changes only the fields sent, and recalculates `amount_cents` | `200`, `404`, or `409` unless it's `pending` |
| `DELETE /bookings/{booking_id}` | Sets the status to `cancelled` | `204`, `404`, or `409` if it's `paid` |

A missing booking's message is `Booking 99 not found`. A paid booking can't be cancelled here
(`Booking 1 is paid; refund it through Paygate first`), and only a `pending` booking can be
changed (`Booking 1 is paid and can't be changed`, with its real status).

### API keys

Every `/bookings` route requires an `X-API-Key` header equal to one of `settings.api_keys`,
compared with `secrets.compare_digest`. Put the dependency on the router, not on each route. A
missing or wrong key is a `401` with `WWW-Authenticate: ApiKey` and the message
`Missing or invalid API key`. `GET /health` answers `{"status": "ok"}` with no key.

### The webhook

`POST /webhooks/paygate` takes no API key: the signature is the authentication. Paygate sends the
event as JSON, with a header like this:

```text
Paygate-Signature: t=1790856000,v1=5f1c0a3e...(64 hex characters)
```

`t` is the Unix time Paygate signed it, and `v1` is the hex HMAC-SHA256, keyed with the webhook
secret, of the bytes `f"{t}."` followed by the **raw request body**. `sign_webhook` in the starter
computes it exactly. `verify_signature` checks, in this order, and the endpoint answers `400` with
the error code shown:

| Check | Code |
|-------|------|
| The header is present and matches `t=<digits>,v1=<64 lowercase hex>` | `invalid_signature` |
| `v1` equals the signature you compute, compared with `hmac.compare_digest` | `invalid_signature` |
| `t` is within `settings.signature_tolerance_seconds` of `get_now()`, before or after | `stale_signature` |

Only after the signature checks out, parse the body into a `WebhookEvent`: `id` (text), `type`
(text), `created` (an int) and `data` (a dict). A signed body that isn't a valid event is also a
`400`. Then apply it:

| Event | Effect | Answer |
|-------|--------|--------|
| an `id` already processed | nothing | `200 {"status": "duplicate"}` |
| `payment.succeeded` for a `pending` booking whose `amount_cents` matches `data.amount_cents` | the booking becomes `paid` | `200 {"status": "processed"}` |
| `payment.succeeded` that doesn't match (wrong amount, or the booking isn't pending) | the booking becomes `needs_review` | `200 {"status": "needs_review"}` |
| `payment.refunded` | the booking becomes `refunded` | `200 {"status": "processed"}` |
| any other type, or a `data.booking_id` that doesn't exist | nothing | `200 {"status": "ignored"}` |

Every event that is verified and parses as a `WebhookEvent` has its id recorded in
`store.processed_events`, whatever the outcome, so Paygate's retries are answered `duplicate`. Webhook responses that are
`2xx` tell Paygate to stop retrying; that's why a mismatch is a `200` that flags the booking for a
human, not an error.

### Errors and request ids

- Every error response is `{"error": {"code": ..., "message": ...}}`. HTTP errors use the codes
  `bad_request`, `unauthorized`, `not_found`, `method_not_allowed` and `conflict` for 400, 401, 404,
  405 and 409; a validation error is `422` with the code `validation_failed`, the message
  `The request is invalid` and a `fields` list, as in lesson 4. Headers on an `HTTPException`
  survive.
- A middleware gives every response an `X-Request-ID`: the client's own, if it's 8 to 64 letters,
  digits and hyphens, or a new `uuid.uuid4().hex`.

### The tests

`test_service.py` runs with `uv run pytest` and needs at least 15 tests. Use fixtures for a fresh
app (built by `create_app` with test settings, and `get_now` pinned through
`app.dependency_overrides`) and for the `AsyncClient`. Cover at least:

- creating a booking, the server-side price, and a client trying to send its own price;
- 401 without a key, 404 for a missing booking, and the error shape;
- patching recalculates the amount, and a paid booking can't be patched or cancelled;
- listing with the status filter and paging;
- a valid payment marks the booking paid;
- a forged signature, a tampered body and a stale timestamp are all refused and change nothing;
- a repeated event is a `duplicate` and isn't applied twice, even after a later event;
- a wrong amount flags the booking, and an unknown event type is ignored;
- two apps from `create_app` don't share bookings.

## Part 1: build and test it in-process

All of this runs without a server, which is how you'll develop it: `python service.py` for the
demo and `uv run pytest` for the tests, with every request sent in-process over `ASGITransport`,
exactly as in the module's drills. FastAPI, httpx and pytest all run in this site's browser Python
too, so any piece can be tried there first.

1. Write the three booking models, `require_api_key`, `pagination` and the `bookings` router with
   `POST` and `GET /bookings/{booking_id}`. Write `create_app` so it sets `app.state`, includes the
   router, and returns the app. (Until `create_app` returns an app, the demo stops with
   `TypeError: 'NoneType' object is not callable`; that's expected.) The first two lines of the
   demo should now match.
2. Add the rest of the CRUD routes, then the error handlers and the request id middleware.
3. Write `verify_signature` and the webhook route, then the event handling. The demo should now
   match line for line.
4. Write `test_service.py`, starting with the fixtures below, and add tests until every rule above
   has one.

```python norun
import json
from datetime import UTC, datetime

import httpx
import pytest

from service import Settings, create_app, get_now, sign_webhook

NOW = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)
SECRET = "whsec_test"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def app():
    app = create_app(Settings(api_keys=["tw_test_key"], webhook_secret=SECRET))
    app.dependency_overrides[get_now] = lambda: NOW
    return app


@pytest.fixture
async def client(app):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def deliver(client, event, secret=SECRET, timestamp=None):
    """POST an event to the webhook, signed as Paygate would sign it."""
    body = json.dumps(event).encode()
    signature = sign_webhook(body, secret, int(NOW.timestamp()) if timestamp is None else timestamp)
    return await client.post("/webhooks/paygate", content=body, headers={"Paygate-Signature": signature})
```

### Things the lessons didn't cover

- **The raw body.** The signature covers the exact bytes Paygate sent. If you let FastAPI parse the
  JSON into a model first, then re-serialise it, the bytes can differ (spacing, key order) and a
  genuine event fails verification. So the webhook route is `async def`, takes `request: Request`,
  reads `body = await request.body()`, verifies it, and only then calls
  `WebhookEvent.model_validate_json(body)`.
- **Signature failures as an exception.** Raise your own exception class from `verify_signature`,
  carrying the error code, and translate it with an exception handler, as in lesson 4. The route
  stays short, and the check can be unit tested without HTTP.
- **Hex HMAC.** `hmac.new(key, message, hashlib.sha256).hexdigest()` gives the 64-character hex
  form Paygate uses; lesson 6 used the raw `digest()` with base64.
- **Why a time window.** Without the timestamp check, anyone who once captured a real signed event
  could post it again tomorrow. Because `t` is inside the signed bytes, it can't be changed without
  breaking the signature.

## Part 2: run it on your machine

Make a project and add the dependencies:

```bash
uv init tidewater-bookings
cd tidewater-bookings
uv add "fastapi[standard]" httpx
uv add --dev pytest
```

Put `service.py` and `test_service.py` in it and run `uv run pytest`. Then start the server. The
settings come from the environment, so set them first (PowerShell: `$env:TIDEWATER_API_KEYS = "..."`):

```bash
export TIDEWATER_API_KEYS="tw_live_desk_4c1e,tw_live_hotel_91b2"
export TIDEWATER_WEBHOOK_SECRET="whsec_local_5d0c"
uv run uvicorn service:app_from_env --factory --reload
```

`--factory` tells uvicorn that `app_from_env` is a function that returns the app. Open
`http://127.0.0.1:8000/docs`, try `POST /bookings` with one of the keys in its `X-API-Key` field,
and create a booking. Or use curl:

```bash
curl -s -X POST http://127.0.0.1:8000/bookings \
  -H "X-API-Key: tw_live_desk_4c1e" -H "Content-Type: application/json" \
  -d '{"customer_email": "ada@example.com", "tour": "island-ferry", "tour_date": "2026-10-12", "party_size": 2}'
```

Then play Paygate. Save this as `send_webhook.py` and run `uv run send_webhook.py 1 4400`:

```python norun
"""Send a signed payment.succeeded event to the local service, as Paygate would."""

import json
import os
import sys
import time
import uuid

import httpx

from service import sign_webhook

booking_id, amount_cents = int(sys.argv[1]), int(sys.argv[2])
event = {
    "id": f"evt_{uuid.uuid4().hex[:12]}",
    "type": "payment.succeeded",
    "created": int(time.time()),
    "data": {"booking_id": booking_id, "amount_cents": amount_cents, "payment_id": "pay_local"},
}
body = json.dumps(event).encode()
signature = sign_webhook(body, os.environ["TIDEWATER_WEBHOOK_SECRET"], int(time.time()))

response = httpx.post(
    "http://127.0.0.1:8000/webhooks/paygate",
    content=body,
    headers={"Paygate-Signature": signature, "Content-Type": "application/json"},
)
print(response.status_code, response.json(), response.headers["x-request-id"])
```

It should print `200 {'status': 'processed'} ...`, and the booking should now be `paid`. Run it
with the secret changed and you get a `400`. To receive webhooks from a real provider, the
service has to be reachable from the internet: a tunnel such as `cloudflared tunnel --url
http://127.0.0.1:8000` gives it a public address for testing. A1 covers deploying it properly.

## Stretch goals

- **Rotating secrets.** Accept a list of webhook secrets, so a new one can be introduced before the
  old one is retired. Paygate may send several `v1=` values in one header; accept the event if any
  of them verifies.
- **An events log.** Keep every verified event (id, type, received time, outcome) and add
  `GET /webhooks/events`, protected by an admin key, so staff can see what Paygate sent.
- **Background confirmation.** When a booking becomes paid, send a confirmation email as a
  background task, to an outbox you can check in tests.
- **Typed all the way.** Make `uv run mypy --strict service.py` pass.
- **Coverage.** Add `pytest-cov` and get the suite to 95% line coverage of `service.py`.

## How to submit

Push `service.py`, `test_service.py`, `send_webhook.py` and a short `README.md` (what it does, how
to run the tests and the server, and the environment variables) to a GitHub repository, and submit
its link on this capstone's page. The review runs your tests, then its own hidden tests against
`create_app` (including forged, tampered, stale and repeated webhooks), plants bugs in a copy of
your service to see whether your suite catches them, and reads the code against the criteria.
Never commit a real secret: the README should name the variables, not their values.
