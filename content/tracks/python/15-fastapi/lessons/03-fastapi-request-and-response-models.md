---
slug: fastapi-request-and-response-models
title: Request and response models
summary: Validate JSON bodies with Pydantic models, control exactly what goes back out, and split create, read and update models so nothing leaks.
minutes: 45
exercises:
  - api-order-quote
  - api-predict-parameter-sources
  - api-fix-leaking-password
  - api-job-applications
  - api-patch-booking
---

Path and query parameters carry small values. Anything bigger, such as a new booking, an order
with its lines or a job application, arrives as a JSON **body**. In module 9 you parsed bodies like
that with Pydantic by hand. In FastAPI you declare the model as a parameter and the parsing happens
before your function runs. The response deserves the same care: what your API sends back is a
contract too, and the classic mistake is sending back more than you meant to.

## A request body is a Pydantic model

Annotate a parameter with a Pydantic model, and FastAPI reads the body as JSON, validates it
against the model, and passes you the model instance:

```python
import asyncio

import httpx
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()


class BookingRequest(BaseModel):
    guest_name: str = Field(min_length=1)
    room_number: int
    nights: int = Field(ge=1, le=14)


@app.post("/bookings", status_code=201)
def create_booking(booking: BookingRequest):
    return {"guest_name": booking.guest_name, "nights": booking.nights, "confirmed": True}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


ok = call("POST", "/bookings", json={"guest_name": "Ada", "room_number": 204, "nights": "3"})
print(ok.status_code, ok.json())

bad = call("POST", "/bookings", json={"guest_name": "", "room_number": 204, "nights": 30})
for problem in bad.json()["detail"]:
    print(bad.status_code, problem["loc"], problem["msg"])
```

Everything you learned about Pydantic applies: `"3"` was converted to `3`, constraints come from
`Field`, and every problem is reported at once, with a location that starts with `"body"`. A body
that isn't JSON at all gets a `422` too. `status_code=201` says "created"; lesson 4 covers status
codes properly.

> [!JS]
> Coming from Express: this replaces `express.json()` plus a zod schema plus
> `schema.safeParse(req.body)`, and it's also what the OpenAPI docs show as the request body.

## Where each parameter comes from

A function can mix all three sources. FastAPI decides where to look from the signature alone:

1. a name that appears in the path is a **path** parameter;
2. a parameter annotated with a Pydantic model is the **body**;
3. any other simple type (`int`, `str`, `bool`, `date`…) is a **query** parameter.

```python
import asyncio

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Note(BaseModel):
    text: str


@app.put("/rooms/{room_number}/note")
def set_room_note(room_number: int, note: Note, notify: bool = False):
    return {"room": room_number, "note": note.text, "notify_housekeeping": notify}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


call("PUT", "/rooms/204/note?notify=true", json={"text": "Extra pillows"}).json()
```

```quiz
question: "`@app.post(\"/orders/{order_id}/refunds\")` with `def refund(order_id: str, amount_cents: int, reason: RefundReason)`, where RefundReason is a Pydantic model. Where does FastAPI look for amount_cents?"
options:
  - "In the path"
  - "In the query string"
  - "Inside the JSON body"
answer: 1
explain: "amount_cents isn't in the path and it's a plain int, so it's a query parameter: /orders/A1042/refunds?amount_cents=500. If it belongs in the body, put it in the RefundReason model."
```

## Response models: say what goes out

Here's the wrong way first. A signup endpoint stores the customer and returns what it stored:

```python
import asyncio
import hashlib

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
customers = {}


class Signup(BaseModel):
    email: str
    name: str
    password: str


@app.post("/customers", status_code=201)
def sign_up(signup: Signup):
    record = {
        "id": len(customers) + 1,
        "email": signup.email,
        "name": signup.name,
        "password_hash": hashlib.sha256(signup.password.encode()).hexdigest(),
        "fraud_score": 0.02,
    }
    customers[record["id"]] = record
    return record


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


call("POST", "/customers", json={"email": "ada@example.com", "name": "Ada", "password": "correct horse"}).json()
```

The password hash and an internal fraud score just went to the browser, and from there into
logs, caches and anyone's dev tools. Nobody decided to publish them; the function returned its
storage record and nothing stopped it.

A **response model** is the fix. `response_model=CustomerRead` makes FastAPI validate the return
value against that model and send *only* its fields:

```python
import asyncio
import hashlib

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
customers = {}


class Signup(BaseModel):
    email: str
    name: str
    password: str


class CustomerRead(BaseModel):
    id: int
    email: str
    name: str


@app.post("/customers", status_code=201, response_model=CustomerRead)
def sign_up(signup: Signup):
    record = {
        "id": len(customers) + 1,
        "email": signup.email,
        "name": signup.name,
        "password_hash": hashlib.sha256(signup.password.encode()).hexdigest(),
        "fraud_score": 0.02,
    }
    customers[record["id"]] = record
    return record


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


call("POST", "/customers", json={"email": "ada@example.com", "name": "Ada", "password": "correct horse"}).json()
```

The function can return a dict, a model or any object with the right attributes; what goes out is
always a `CustomerRead`. It's an allow-list: a field someone adds to the storage record next year
stays private unless they also add it to the read model. The model also documents the response in
OpenAPI. When your function returns model instances, a return annotation (`-> CustomerRead`) does
the same job as `response_model=`.

> [!WARNING]
> The response is validated too. If your function returns something that doesn't fit the model
> (a missing field, say), that's a bug in your server, not the client's fault: FastAPI raises
> `ResponseValidationError`, which becomes a `500`. In tests over `ASGITransport` the exception
> reaches your test directly, with the details.

## Create, read and update models

One model per direction is the pattern that keeps this safe. The fields a client may *send* when
creating something aren't the fields you *return*, and neither is what they may *change*:

| Model | Used for | Has |
|-------|----------|-----|
| `CustomerCreate` | the POST body | everything the client provides, including the password |
| `CustomerRead` | every response | what the client may see: the server's `id`, never the password |
| `CustomerUpdate` | the PATCH body | only the changeable fields, all optional |

Shared fields go in a base class so they're declared once:

```python
from pydantic import BaseModel, Field


class CustomerBase(BaseModel):
    email: str
    name: str = Field(min_length=1)


class CustomerCreate(CustomerBase):
    password: str = Field(min_length=12)


class CustomerRead(CustomerBase):
    id: int


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    marketing_opt_in: bool | None = None


sorted(CustomerCreate.model_fields), sorted(CustomerRead.model_fields), sorted(CustomerUpdate.model_fields)
```

Notice what the client *can't* do: there's no `id` in `CustomerCreate`, so a client can't choose
its own id, and `CustomerUpdate` has no `email` or `password`, so a PATCH can't change them.

## Patching only what was sent

A `PATCH` changes some fields and leaves the rest alone. The update model makes every field
optional, so how do you tell "the client left `name` out" from "the client set it to `null`"?
Pydantic remembers which fields were actually set, and `model_dump(exclude_unset=True)` returns
only those:

```python
from pydantic import BaseModel


class BookingUpdate(BaseModel):
    guests: int | None = None
    notes: str | None = None


stored = {"id": 7, "guests": 2, "notes": "Late arrival"}

change = BookingUpdate.model_validate({"guests": 3})
print("wrong:", stored | change.model_dump())
print("right:", stored | change.model_dump(exclude_unset=True))

clear_notes = BookingUpdate.model_validate({"notes": None})
print("clear:", stored | clear_notes.model_dump(exclude_unset=True))
```

The wrong version wiped out the notes the client never mentioned. With `exclude_unset=True`, an
omitted field stays as it was and an explicit `null` clears it, which is exactly what PATCH means.

## Where this leaves you

A Pydantic model parameter is the request body, validated before your code runs; path names, models
and simple types decide where each parameter comes from. `response_model` makes the response an
allow-list, so internal fields can't leak. Separate create, read and update models say what a client
may send, see and change, and `exclude_unset=True` makes a PATCH touch only what was sent.
