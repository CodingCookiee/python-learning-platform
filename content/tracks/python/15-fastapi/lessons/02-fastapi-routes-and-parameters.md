---
slug: fastapi-routes-and-parameters
title: Routes, path and query parameters
summary: Read typed values from the path and the query string, constrain them with Annotated, and know which route a request will match.
minutes: 40
exercises:
  - api-room-by-number
  - api-predict-route-match
  - api-job-search
  - api-fix-unvalidated-limit
  - api-room-quote
---

A URL carries information in two places. The **path**, `/jobs/1042`, says *which* thing you want.
The **query string**, `?remote=true&limit=20`, says *how*: filters, sorting, pages. In FastAPI both
arrive as ordinary function parameters, typed and validated, and your function only runs once
they're right. This lesson covers both, the constraints that keep them sane, and the rule that
decides which route a request matches.

## Path parameters

A name in braces in the path is a **path parameter**, and the function parameter with the same name
receives it. The annotation decides its type; without one, it's a `str`. A path can have several:

```python
import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/customers/{customer_id}/orders/{order_id}")
def customer_order(customer_id: int, order_id: str):
    return {"customer_id": customer_id, "order_id": order_id}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


call("GET", "/customers/7/orders/A1042").json()
```

When only a few values make sense, say so with `Literal` (or an `Enum`). Anything else is refused,
and the error lists what's allowed:

```python
import asyncio
from typing import Literal

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/reports/{period}")
def sales_report(period: Literal["daily", "weekly", "monthly"]):
    return {"period": period}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


print(call("GET", "/reports/weekly").json())
print(call("GET", "/reports/yearly").json()["detail"][0]["msg"])
```

> [!JS]
> Coming from Express: `req.params.id` is always a string, and parsing and checking it is up to you
> (or zod). In FastAPI, the function signature *is* the schema.

## Routes are matched in order

FastAPI tries the routes in the order you declared them, and the first whose path matches wins.
Here's the wrong way first, and it's a very common bug:

```python
import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/jobs/{job_id}")
def get_job(job_id: int):
    return {"job_id": job_id}


@app.get("/jobs/latest")
def latest_job():
    return {"job_id": 1042, "latest": True}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


response = call("GET", "/jobs/latest")
response.status_code, response.json()["detail"][0]["loc"]
```

`/jobs/latest` matches the pattern `/jobs/{job_id}`, so `get_job` was chosen, and then `"latest"`
failed to become an `int`. Matching looks at the path's shape, not the types. The fix is to declare
fixed paths *before* the parameterised paths they overlap with. Swap the two functions above and
run it again: `/jobs/latest` then reaches `latest_job`.

```quiz
question: "An app declares `/bookings/{booking_id}` (with `booking_id: str`) and then `/bookings/today`. What does `GET /bookings/today` return?"
options:
  - "The result of the today route"
  - "The result of the booking_id route, with booking_id = \"today\""
  - "422, because the two routes clash"
answer: 1
explain: "The first route whose path matches wins. /bookings/{booking_id} matches, and \"today\" is a perfectly good str, so the today route is never reached. Declare fixed paths first."
```

## Query parameters

Any simple parameter that isn't in the path is read from the **query string**. A default makes it
optional; no default makes it required. Types convert just as they do for the path, and `bool`
accepts `true`/`false`, `1`/`0`, `yes`/`no` and `on`/`off`:

```python
import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/jobs")
def search_jobs(q: str, remote: bool = False, company: str | None = None):
    return {"q": q, "remote": remote, "company": company}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


print(call("GET", "/jobs?q=backend&remote=yes").json())
print(call("GET", "/jobs", params={"q": "data", "company": "Kiln Cafe"}).json())
missing = call("GET", "/jobs?remote=true")
print(missing.status_code, missing.json()["detail"][0]["loc"], missing.json()["detail"][0]["msg"])
```

`params=` in httpx builds and escapes the query string for you, which you met in module 14. Note
`company: str | None = None`: as in Pydantic, it's the `= None` that makes it optional, and
`| None` says `None` is an allowed value.

## Constraints with Annotated

A type says what kind of value is acceptable, but not which values. Here's the wrong way first: a
paged list of orders with nothing stopping a silly page size.

```python
import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()
ORDERS = [{"id": f"A{1000 + n}"} for n in range(1, 501)]


@app.get("/orders")
def list_orders(page: int = 1, per_page: int = 20):
    start = (page - 1) * per_page
    return ORDERS[start:start + per_page]


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


print(len(call("GET", "/orders?per_page=100000").json()))
print(call("GET", "/orders?page=0").json())
```

The first request dumps every order in one response (with a real database, that's a slow query and
a huge payload any client can trigger). The second silently returns nothing, because `page=0` makes
a negative slice. Neither is what the client meant, and neither tells them.

`Annotated` attaches rules to a type, exactly as it did for Pydantic fields in module 9. `Query(...)`
holds the rules for a query parameter and `Path(...)` those for a path parameter:

```python
import asyncio
from typing import Annotated

import httpx
from fastapi import FastAPI, Path, Query

app = FastAPI()
ORDERS = [{"id": f"A{1000 + n}"} for n in range(1, 501)]


@app.get("/orders")
def list_orders(
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
):
    start = (page - 1) * per_page
    return ORDERS[start:start + per_page]


@app.get("/orders/{order_number}")
def get_order(order_number: Annotated[int, Path(ge=1001, le=1500)]):
    return ORDERS[order_number - 1001]


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


for path in ["/orders?per_page=100000", "/orders?page=0", "/orders?page=3&per_page=50", "/orders/1042", "/orders/99"]:
    print(path, call("GET", path).status_code)

call("GET", "/orders/99").json()["detail"][0]["msg"]
```

The default goes after the `=` as usual. The same keywords as Pydantic's `Field` work here: `gt`,
`ge`, `lt`, `le` for numbers, and `min_length`, `max_length` and `pattern` for strings. They also
appear in the OpenAPI docs, so clients can see the limits before they hit them.

> [!WARNING]
> Every value in a request comes from a client you don't control. A page size, a date range or a
> search string without limits is an invitation to make your service do far too much work. Put a
> ceiling on anything that scales the cost of a request.

## Lists and dates in the query

A query parameter can repeat, as in `?tag=gift&tag=fragile`. To collect every value, make it a list
and mark it with `Query()`, since FastAPI would otherwise look for a list in the body. Dates,
datetimes and decimals are parsed from ISO text, as Pydantic does:

```python
import asyncio
from datetime import date
from typing import Annotated

import httpx
from fastapi import FastAPI, Query

app = FastAPI()


@app.get("/deliveries")
def deliveries(on: date, tag: Annotated[list[str], Query()] = []):
    return {"weekday": on.strftime("%A"), "tags": tag}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


print(call("GET", "/deliveries?on=2026-10-02&tag=gift&tag=fragile").json())
print(call("GET", "/deliveries?on=02/10/2026").status_code)
```

The `= []` default is safe here, for the same reason it was safe in a Pydantic model: FastAPI makes
a fresh value for every request.

## Where this leaves you

Path parameters identify the resource and query parameters shape the answer. Both are typed
function parameters, a default makes a query parameter optional, and `Annotated` with `Path(...)`
or `Query(...)` adds limits that are enforced and documented. Routes match in declaration order,
so put fixed paths before the parameterised ones they overlap. The drills practise each, and end
with a quote endpoint that combines all of them.
