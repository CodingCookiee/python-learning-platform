---
slug: fastapi-status-codes-and-errors
title: Status codes and errors
summary: Pick the status code that tells the client what happened, raise HTTPException for 404s and 409s, and give every error in the API the same shape.
minutes: 45
exercises:
  - api-fix-created-status
  - api-predict-status-codes
  - api-order-errors
  - api-consistent-error-shape
---

In module 14 your client code read status codes to decide what to do: retry a `503`, refresh a
token on a `401`, show a message on a `422`. Now you're the one choosing them, and every client of
your API will make those same decisions based on what you send. An API that answers `200` with
`{"error": "not found"}` in the body forces every client to parse the body to find out whether it
worked. This lesson is about getting the status right, and making errors easy to handle.

## Choosing the status code

These are the codes a typical JSON API uses. FastAPI sends the ones marked "automatic" for you:

| Code | Name | When |
|------|------|------|
| `200` | OK | A read or an update worked, and the body has the result |
| `201` | Created | A POST created something; the body is the new thing |
| `204` | No Content | It worked and there's nothing to send back, typically a DELETE |
| `401` / `403` | Unauthorized / Forbidden | Who you are, and what you may do (lesson 6) |
| `404` | Not Found | The thing named in the path doesn't exist (automatic for unknown routes) |
| `405` | Method Not Allowed | The path exists but not with that method (automatic) |
| `409` | Conflict | The request is fine, but it clashes with the current state |
| `422` | Unprocessable Content | The request doesn't match the schema (automatic) |
| `500` | Internal Server Error | Your code crashed; never the client's fault |

A path operation answers `200` unless you say otherwise with `status_code=` in the decorator. The
`status` module has a named constant for every code, if you prefer names to numbers:

```python
import asyncio
from itertools import count

import httpx
from fastapi import FastAPI, status
from pydantic import BaseModel

app = FastAPI()
bookings = {}
booking_ids = count(1)


class BookingCreate(BaseModel):
    guest_name: str
    room_number: int


@app.post("/bookings", status_code=status.HTTP_201_CREATED)
def create_booking(booking: BookingCreate):
    booking_id = next(booking_ids)
    bookings[booking_id] = {"id": booking_id, **booking.model_dump()}
    return bookings[booking_id]


@app.delete("/bookings/{booking_id}", status_code=204)
def cancel_booking(booking_id: int):
    bookings.pop(booking_id, None)


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


created = call("POST", "/bookings", json={"guest_name": "Ada", "room_number": 204})
deleted = call("DELETE", f"/bookings/{created.json()['id']}")
created.status_code, created.json(), deleted.status_code, deleted.content
```

With `204`, the function returns nothing and the body is empty: `b''`. A `204` must never have a
body, so don't return one.

## Raising HTTPException

When the answer is an error, **raise** `HTTPException` with the status and a `detail`. Raising stops
the function wherever it is, even several calls deep, and FastAPI turns it into a JSON response:

```python
import asyncio

import httpx
from fastapi import FastAPI, HTTPException

app = FastAPI()
orders = {"A1042": {"order_id": "A1042", "status": "shipped"}}


def find_order(order_id: str) -> dict:
    if order_id not in orders:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return orders[order_id]


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    return find_order(order_id)


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


for order_id in ["A1042", "A9999"]:
    response = call("GET", f"/orders/{order_id}")
    print(response.status_code, response.json())
```

A helper like `find_order` that either returns the thing or raises the `404` keeps every endpoint
that needs an order short. `HTTPException` also takes `headers=`, for errors that should carry
one, such as `Retry-After` on a `429`.

> [!JS]
> Coming from Express: it's `throw createError(404, "...")` rather than
> `return res.status(404).json(...)`. Because it's raised, you can't forget the `return` and carry on
> running the handler.

## 404, 409 or 422?

These three are the ones people mix up. Ask in this order:

1. **Is the request the right shape?** Missing fields, wrong types, values outside their limits:
   that's `422`, and FastAPI sends it before your code runs.
2. **Does the thing in the path exist?** No: `404`.
3. **Does the request clash with the current state?** A second account with the same email,
   cancelling an order that has already shipped, booking a room that's taken: `409`.

A `409` says "your request made sense, and the answer is no because of how things are right now".
The client can often do something about it: pick another room, or log in instead of signing up.

```quiz
question: "A client sends `POST /bookings` with a perfectly valid body, but the room is already booked for those nights. Which status fits?"
options:
  - "404 Not Found"
  - "409 Conflict"
  - "422 Unprocessable Content"
answer: 1
explain: "The body matches the schema, so it isn't a 422, and the room exists, so it isn't a 404. The request clashes with the current state of the bookings: that's a 409."
```

## Custom exceptions and handlers

Your business logic shouldn't need to know it's running inside a web framework. It can raise its own
exceptions (module 6), and an **exception handler** translates them into responses in one place:

```python
import asyncio

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


class RoomUnavailable(Exception):
    def __init__(self, room_number: int):
        super().__init__(f"Room {room_number} is already booked")
        self.room_number = room_number


def reserve(room_number: int) -> dict:
    """Business logic: knows about rooms, not about HTTP."""
    if room_number == 204:
        raise RoomUnavailable(room_number)
    return {"room_number": room_number, "reserved": True}


@app.exception_handler(RoomUnavailable)
async def room_unavailable(request: Request, exc: RoomUnavailable):
    return JSONResponse(status_code=409, content={"detail": str(exc), "room_number": exc.room_number})


@app.post("/rooms/{room_number}/reservations", status_code=201)
def create_reservation(room_number: int):
    return reserve(room_number)


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


for room in [101, 204]:
    response = call("POST", f"/rooms/{room}/reservations")
    print(response.status_code, response.json())
```

The handler receives the request and the exception and returns a response. `JSONResponse` is the
response class FastAPI uses behind the scenes; returning one yourself gives you full control of the
status, body and headers.

## One error shape for the whole API

Look at the errors so far. An `HTTPException` gives `{"detail": "Order A9999 not found"}`, a
validation error gives `{"detail": [ {...}, {...} ]}`, and your own handler gave something else
again. A client has to handle three shapes. A well-designed API picks one and uses it everywhere.

Two handlers cover everything FastAPI produces. One for `HTTPException`, including the `404` and
`405` the router sends for unknown paths, and one for `RequestValidationError`, the `422`:

```python
import asyncio

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

app = FastAPI()


def error(status: int, code: str, message: str, **extra) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, **extra}})


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    codes = {404: "not_found", 405: "method_not_allowed", 409: "conflict"}
    response = error(exc.status_code, codes.get(exc.status_code, "error"), str(exc.detail))
    response.headers.update(exc.headers or {})
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    fields = [{"field": ".".join(str(part) for part in problem["loc"]), "message": problem["msg"]} for problem in exc.errors()]
    return error(422, "validation_failed", "The request is invalid", fields=fields)


class Order(BaseModel):
    sku: str
    quantity: int = Field(gt=0)


@app.post("/orders", status_code=201)
def create_order(order: Order):
    raise HTTPException(409, "Order limit reached for today")


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


print(call("GET", "/nowhere").json())
print(call("DELETE", "/orders").json())
print(call("POST", "/orders", json={"sku": "MUG-01", "quantity": 0}).json())
print(call("POST", "/orders", json={"sku": "MUG-01", "quantity": 1}).json())
```

Every error now has a machine-readable `code` for the client's `if` statements and a `message` for
humans, and validation errors list each field. Headers set on the exception, such as the `Allow`
header on a `405`, are copied across.

> [!WARNING]
> Register the handler for **Starlette's** `HTTPException` (imported here as
> `StarletteHTTPException`), not FastAPI's. FastAPI's is a subclass, so the Starlette handler catches
> both, but the router's own `404` and `405` are raised as the Starlette class and would slip past a
> handler for FastAPI's.

Error messages are read by strangers. Say what was wrong with the request, and never include
tracebacks, SQL, file paths or other internals: those belong in your logs.

## Where this leaves you

The status code is the first thing a client reads, so make it tell the truth: `201` for creation,
`204` for nothing to return, `404` for a missing resource, `409` for a clash with current state,
and `422` (automatic) for a malformed request. `HTTPException` raises an error response from
anywhere, exception handlers translate your own exceptions, and two handlers give the whole API one
error shape. The drills fix wrong codes, predict them, and build that consistent shape.
