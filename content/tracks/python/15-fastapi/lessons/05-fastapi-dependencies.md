---
slug: fastapi-dependencies
title: Dependency injection
summary: Share pagination, sessions and clocks between endpoints with Depends, clean up resources with yield, and swap any dependency for a fake in tests.
minutes: 45
exercises:
  - api-pagination-dependency
  - api-predict-dependency-calls
  - api-session-dependency
  - api-refactor-clock-dependency
  - api-test-cancellation-rules
---

Real endpoints need things before they can start: the paging parameters, a database session, the
current user, today's exchange rates. Written into every endpoint by hand, that code is copied ten
times, and the eleventh endpoint forgets a check. FastAPI's answer is the **dependency**: a function
it calls before your endpoint, whose result it passes in. Dependencies also answer a testing
question you met in module 7: how do you give code a fake database or a fixed clock without
editing it? You override the dependency.

## Depends: a function FastAPI calls for you

Here's a paging dependency. It's an ordinary function, and its parameters are read from the
request exactly as an endpoint's are, so `offset` and `limit` are validated query parameters:

```python
import asyncio
from dataclasses import dataclass
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, Query

app = FastAPI()
INVOICES = [{"number": f"INV-{n:04d}"} for n in range(1, 58)]


@dataclass
class Page:
    offset: int
    limit: int


def pagination(
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> Page:
    return Page(offset, limit)


@app.get("/invoices")
def list_invoices(page: Annotated[Page, Depends(pagination)]):
    return {"total": len(INVOICES), "items": INVOICES[page.offset:page.offset + page.limit]}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


data = call("GET", "/invoices?offset=50&limit=5").json()
print(data["total"], data["items"])
print(call("GET", "/invoices?limit=500").status_code)
```

`Annotated[Page, Depends(pagination)]` says "this parameter is a `Page`, and you get it by calling
`pagination`". You pass the function itself, not `pagination()`. When several endpoints share it,
give the annotation a name once, `type PageParams = Annotated[Page, Depends(pagination)]`, and write
`page: PageParams` everywhere. The query parameters still appear in each endpoint's OpenAPI docs.

> [!JS]
> Coming from Express: it's the job `app.use()` middleware does when it sets `req.user`, except
> each endpoint declares exactly what it needs, typed, instead of trusting that some middleware ran
> earlier. It's closest to NestJS's injected providers.

## Dependencies of dependencies

A dependency can declare dependencies of its own, and FastAPI resolves the whole tree for each
request. Within one request, each dependency is called **once**, and its result is shared by
everything that asks for it:

```python
import asyncio
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI

app = FastAPI()
calls = []


def get_db():
    calls.append("get_db")
    return {"customers": {7: "Kiln Cafe"}}


def current_customer(db: Annotated[dict, Depends(get_db)]):
    calls.append("current_customer")
    return db["customers"][7]


@app.get("/me")
def me(customer: Annotated[str, Depends(current_customer)], db: Annotated[dict, Depends(get_db)]):
    return {"customer": customer, "known_customers": len(db["customers"])}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


print(call("GET", "/me").json())
print(calls)
```

`get_db` is needed twice, by `current_customer` and by the endpoint, but it ran once, so both got
the same object. That's what you want for a database session: one per request, shared.

## Resources with yield

Some dependencies hand out something that must be cleaned up: a database session to close, a lock
to release. Write them as generators, like the context managers from module 8. The code before
`yield` sets up, the yielded value is what the endpoint receives, and the code after runs once the
request is finished. An exception raised by the endpoint is raised inside the dependency at the
`yield`, so it can roll back:

```python
import asyncio
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException

app = FastAPI()
events = []


def get_session():
    events.append("open")
    try:
        yield "session"
        events.append("commit")
    except Exception:
        events.append("rollback")
        raise
    finally:
        events.append("close")


@app.post("/orders/{order_id}/refund")
def refund(order_id: str, session: Annotated[str, Depends(get_session)]):
    events.append("refund " + order_id)
    if order_id == "A1042":
        raise HTTPException(409, "Already refunded")
    return {"refunded": order_id}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


for order_id in ["A1043", "A1042"]:
    events.clear()
    response = call("POST", f"/orders/{order_id}/refund")
    print(response.status_code, events)
```

The `raise` after the rollback matters. Swallow the exception and the client gets no error
response at all; re-raise it and FastAPI turns the `HTTPException` into the `409` as usual.

> [!NOTE]
> By default the code after `yield` runs after the response has been sent. With
> `Depends(get_session, scope="function")` it runs as soon as the endpoint returns, before the
> response goes out, so a commit that fails can still become an error response.

## Overriding dependencies in tests

Because the endpoint asks for its dependencies instead of creating them, a test can supply
different ones. `app.dependency_overrides` maps the original dependency function to a replacement,
and FastAPI calls the replacement everywhere the original was used. Here the real `get_rates`
would call a currency API over the network (module 14):

```python
import asyncio
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI

app = FastAPI()
PRICES_EUR = {"MUG-01": 8.0}


def get_rates() -> dict[str, float]:
    raise RuntimeError("calls https://rates.example.com, which tests must never do")


@app.get("/products/{sku}/price")
def price(sku: str, currency: str, rates: Annotated[dict[str, float], Depends(get_rates)]):
    return {"sku": sku, "currency": currency, "price": round(PRICES_EUR[sku] * rates[currency], 2)}


async def test_converts_the_price():
    app.dependency_overrides[get_rates] = lambda: {"EUR": 1.0, "GBP": 0.85}
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/products/MUG-01/price?currency=GBP")
        assert response.json() == {"sku": "MUG-01", "currency": "GBP", "price": 6.8}
    finally:
        app.dependency_overrides.clear()


asyncio.run(test_converts_the_price())
print("passed, and no network call was made")
```

The key is the original function object, `get_rates`, not its name. Always clear the overrides
afterwards, or the fake leaks into the next test.

```quiz
question: "An endpoint calls `datetime.now(UTC)` directly to decide whether a booking can still be cancelled. What's the simplest way to test the '47 hours before' case?"
options:
  - "Wait until 47 hours before a real booking"
  - "Move the clock into a get_now dependency, and override it in the test"
  - "Change the booking's start time in the test so it's 47 hours from whenever the test runs"
answer: 1
explain: "A get_now dependency makes time an input. The test overrides it with a fixed moment, so the result is the same every run. Shifting the data around the real clock works until the test is slow or runs across midnight."
```

## A testing strategy for services

Module 7's rules apply unchanged, with the client as the "act" step: **arrange** the data and the
overrides, **act** with one request, **assert** on the status and the body, one behaviour per test.
On your machine, pytest fixtures remove the repetition. FastAPI installs anyio, whose pytest plugin
runs `async def` tests marked with `@pytest.mark.anyio`:

```python norun
import httpx
import pytest

from main import app, get_rates


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    app.dependency_overrides[get_rates] = lambda: {"EUR": 1.0, "GBP": 0.85}
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_converts_the_price(client):
    response = await client.get("/products/MUG-01/price?currency=GBP")
    assert response.json()["price"] == 6.8


@pytest.mark.anyio
async def test_euro_prices_are_unchanged(client):
    response = await client.get("/products/MUG-01/price?currency=EUR")
    assert response.json()["price"] == 8.0
```

Everything after the fixture's `yield` runs after each test, pass or fail, so the overrides never
leak. This exact setup runs in the browser too: the last drill of this lesson has you write such a
test file and run it with real pytest.

## Where this leaves you

A dependency is a function FastAPI calls before your endpoint; declare it with
`Annotated[Type, Depends(function)]`. Its own parameters come from the request, dependencies can
depend on each other, and each runs once per request. Generator dependencies set up and clean up
resources, seeing the endpoint's exceptions at the `yield`. `app.dependency_overrides` swaps any of
them for a fake in tests, which is why a clock or an outside service belongs in a dependency.
