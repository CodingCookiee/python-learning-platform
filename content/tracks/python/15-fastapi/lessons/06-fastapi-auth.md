---
slug: fastapi-auth
title: Authentication and untrusted input
summary: Check API keys and bearer tokens in dependencies, answer 401, 403 and 404 correctly, and take identity, prices and roles from the server, never from the request.
minutes: 45
exercises:
  - api-require-api-key
  - api-predict-auth-status
  - api-fix-trusted-price
  - api-own-bookings-only
  - api-signed-token
---

In module 14 you sent API keys and bearer tokens to other people's services. Now requests arrive at
yours, and two questions come before anything else: **who is calling** (authentication), and **are
they allowed to do this** (authorization). Both fit naturally into dependencies. Behind both sits
one rule that matters more than any library: everything in a request was written by the client,
and a client can write anything.

## An API key dependency

A partner integration usually authenticates with an API key in a header. A `Header()` parameter
reads one; FastAPI turns the underscores in the name into hyphens and ignores case, so `x_api_key`
reads `X-API-Key`. The dependency either returns *who* the caller is, or raises `401`:

```python
import asyncio
import secrets
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException

app = FastAPI()
API_KEYS = {"pk_live_kiln_7f3a9c": "Kiln Cafe", "pk_live_harbour_2b81d4": "Harbour Freight"}


def current_partner(x_api_key: Annotated[str | None, Header()] = None) -> str:
    if x_api_key is None:
        raise HTTPException(401, "Missing API key", headers={"WWW-Authenticate": "ApiKey"})
    for key, partner in API_KEYS.items():
        if secrets.compare_digest(x_api_key, key):
            return partner
    raise HTTPException(401, "Invalid API key", headers={"WWW-Authenticate": "ApiKey"})


@app.get("/partners/me")
def me(partner: Annotated[str, Depends(current_partner)]):
    return {"partner": partner}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


for headers in [{}, {"X-API-Key": "pk_live_guess"}, {"X-API-Key": "pk_live_kiln_7f3a9c"}]:
    response = call("GET", "/partners/me", headers=headers)
    print(response.status_code, response.json(), response.headers.get("www-authenticate"))
```

`secrets.compare_digest` compares in constant time. A plain `==` stops at the first different
character, and an attacker measuring response times can use that to guess a key one character at a
time. In production, store a hash of each key rather than the key itself, just as you would a
password, so a leaked database doesn't leak working keys.

> [!TIP]
> `fastapi.security.APIKeyHeader(name="X-API-Key")` does the header reading for you and adds the
> key to the OpenAPI docs, so `/docs` shows a padlock and an "Authorize" button. It's a dependency
> like any other: `key: Annotated[str, Depends(APIKeyHeader(name="X-API-Key"))]`.

## Protecting endpoints

When the endpoint needs to know who's calling, take the dependency as a parameter, as `me` does.
When it only needs the check, put it in the decorator's `dependencies=` list, and the result is
thrown away:

```python norun
@app.post("/admin/reindex", status_code=202, dependencies=[Depends(current_partner)])
def reindex():
    ...
```

To protect a whole group of endpoints at once, the same list goes on an `APIRouter` (lesson 7) or
on the app itself, `FastAPI(dependencies=[Depends(current_partner)])`.

Two status codes mean two different things, and clients react differently to each:

- `401 Unauthorized` means "I don't know who you are": the credentials are missing, wrong or
  expired. The client should log in again, or fix its key. Send a `WWW-Authenticate` header saying
  which scheme you expect.
- `403 Forbidden` means "I know who you are, and you may not do this": a read-only key trying to
  write, a customer calling a staff endpoint. Logging in again won't help.

## Whose data is it?

Authentication tells you the caller is Ada. It doesn't tell you that booking `B-2` is hers. Every
endpoint that takes an id must check the resource belongs to the caller, or it leaks everyone's
data to anyone with a valid key. It's the most common API security bug there is, and it has a
name: broken object-level authorization.

```python
import asyncio
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException

app = FastAPI()
KEYS = {"key_ada": "cus_ada", "key_grace": "cus_grace"}
BOOKINGS = {"B-1": {"customer_id": "cus_ada", "tour": "Harbour kayak"}, "B-2": {"customer_id": "cus_grace", "tour": "Island ferry"}}


def current_customer(x_api_key: Annotated[str | None, Header()] = None) -> str:
    if x_api_key not in KEYS:
        raise HTTPException(401, "Invalid API key")
    return KEYS[x_api_key]


@app.get("/bookings/{booking_id}")
def get_booking(booking_id: str, customer: Annotated[str, Depends(current_customer)]):
    booking = BOOKINGS.get(booking_id)
    if booking is None or booking["customer_id"] != customer:
        raise HTTPException(404, f"Booking {booking_id} not found")
    return booking


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


for booking_id in ["B-1", "B-2", "B-3"]:
    response = call("GET", f"/bookings/{booking_id}", headers={"X-API-Key": "key_ada"})
    print(booking_id, response.status_code, response.json())
```

Ada gets the same `404` for Grace's booking as for one that doesn't exist. A `403` would confirm
that `B-2` is real, which is already more than a stranger should learn.

```quiz
question: "A customer's valid key requests `DELETE /bookings/B-7`, which belongs to another customer. Customers may delete their own bookings. What should the API answer?"
options:
  - "401, because the customer isn't authenticated for B-7"
  - "403, because it's someone else's booking"
  - "404, as if B-7 didn't exist"
answer: 2
explain: "The key is valid, so it isn't a 401. Customers may delete bookings, so it isn't a lack of permission for the action; the booking simply isn't theirs, and a 404 avoids confirming it exists. A 403 fits when the caller can't do this kind of thing at all, such as a customer calling a staff-only endpoint."
```

## Tokens, JWT and OAuth2 in brief

Apps with users usually send a **bearer token** instead of a key: `Authorization: Bearer <token>`.
The most common format is the **JWT** (JSON Web Token): three base64url parts joined by dots, a
header, a payload of **claims** such as the user id (`sub`) and expiry (`exp`), and a signature.
The payload is only encoded, not encrypted, so anyone can read it:

```python
import base64
import hashlib
import hmac
import json


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


SECRET = b"server-side secret"
header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
payload = b64url(json.dumps({"sub": "cus_ada", "role": "customer", "exp": 1790000000}).encode())
signature = b64url(hmac.new(SECRET, f"{header}.{payload}".encode(), hashlib.sha256).digest())
token = f"{header}.{payload}.{signature}"

# Anyone can read the claims...
print(json.loads(b64url_decode(token.split(".")[1])))

# ...and anyone can change them, but not re-sign them without the secret
forged_payload = b64url(json.dumps({"sub": "cus_ada", "role": "admin", "exp": 1790000000}).encode())
expected = b64url(hmac.new(SECRET, f"{header}.{forged_payload}".encode(), hashlib.sha256).digest())
hmac.compare_digest(signature, expected)
```

What makes a token trustworthy is that the server **verifies the signature and the expiry** before
believing a single claim. Never put secrets in the payload, and never read claims from a token you
haven't verified. **OAuth2** is the family of flows for *getting* a token, such as logging in with
a password or "Sign in with Google". In FastAPI, `OAuth2PasswordBearer` reads the bearer token and
documents it, and a library such as PyJWT does the verifying:

```python norun
import os
from typing import Annotated

import jwt  # uv add pyjwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
JWT_SECRET = os.environ["JWT_SECRET"]


def current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])  # checks signature and exp
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token", headers={"WWW-Authenticate": "Bearer"})
    return claims["sub"]
```

Always pass `algorithms=` explicitly: some old libraries accepted a token that declared `"alg":
"none"`, meaning no signature at all. The last drill of this lesson builds a small signed token by
hand, so you know exactly what that `decode` call checks.

## Never trust client input

Here's the wrong way first. This order endpoint believes everything it's told:

```python
import asyncio

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class OrderCreate(BaseModel):
    customer_id: str
    sku: str
    quantity: int
    unit_price_cents: int
    is_staff_discount: bool = False


@app.post("/orders", status_code=201)
def place_order(order: OrderCreate):
    total = order.quantity * order.unit_price_cents
    if order.is_staff_discount:
        total //= 2
    return {"customer_id": order.customer_id, "total_cents": total}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


call("POST", "/orders", json={
    "customer_id": "cus_grace", "sku": "BEANS-1KG", "quantity": 10,
    "unit_price_cents": 1, "is_staff_discount": True,
}).json()
```

Ten kilos of coffee for five cents, on someone else's account. Validation passed, because every
field had the right type. The problem is which fields exist. The rules:

- **Identity comes from authentication**, never from the body, a query parameter or a header like
  `X-User-Id`.
- **Prices, totals and discounts come from your own data.** The client says *what* it wants; the
  server says what it costs.
- **Roles and permissions come from your database** (or a verified token), never from a flag in
  the request.
- **Refuse fields you didn't ask for.** `model_config = ConfigDict(extra="forbid")` on request models
  turns a sneaky `"is_admin": true` into a `422` instead of something a later refactor might start
  reading.

## Where this leaves you

Authentication is a dependency that returns the caller or raises `401`; compare secrets with
`secrets.compare_digest`. A `403` means the caller is known but not allowed; someone else's
resource is a `404`. Tokens such as JWTs are only as good as the signature and expiry checks you
run before reading their claims. Most of all, the request tells you what the client *wants*, never
who they are, what things cost or what they're allowed to do.
