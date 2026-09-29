---
slug: fastapi-middleware-and-structure
title: Background tasks, middleware and larger apps
summary: Run work after the response, wrap every request with middleware, understand CORS, and grow a service with routers, settings and an app factory.
minutes: 50
exercises:
  - api-welcome-email-background
  - api-predict-middleware-order
  - api-request-id-middleware
  - api-refactor-orders-router
  - api-app-factory
---

Three problems show up once a service does real work. Some jobs, like sending an email, shouldn't
make the client wait. Some code, like timing or tagging requests, has to run for *every* request,
including the ones no endpoint handles. And a single file with thirty endpoints stops being
readable. FastAPI has a tool for each: background tasks, middleware, and routers plus an app
factory. This lesson covers all three, plus CORS, which every API called from a browser runs into.

## Background tasks

Ask for a `BackgroundTasks` parameter and add functions to it. FastAPI sends the response first,
then runs them:

```python
import asyncio

import httpx
from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel

app = FastAPI()
outbox = []


class Signup(BaseModel):
    email: str
    name: str


def send_welcome_email(email: str, name: str) -> None:
    outbox.append({"to": email, "subject": f"Welcome aboard, {name}"})


@app.post("/signups", status_code=201)
def sign_up(signup: Signup, background_tasks: BackgroundTasks):
    background_tasks.add_task(send_welcome_email, signup.email, signup.name)
    return {"email": signup.email, "status": "pending"}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


response = call("POST", "/signups", json={"email": "ada@example.com", "name": "Ada"})
response.status_code, outbox
```

`add_task(function, *args)` takes the function and its arguments, not a call. Over `ASGITransport`
the task has finished by the time the request returns, which is why the test above can check the
outbox straight away. A real client already has its response by then.

> [!WARNING]
> Background tasks run inside the web server process. If it restarts, a pending task is lost, and a
> task that fails isn't retried. They're right for "nice to have soon" work. Work that must happen,
> such as charging a card or delivering a webhook, belongs in a proper job queue, which the
> automation track covers.

## Middleware: code around every request

Middleware wraps the whole app. It receives each request before any routing happens, passes it on
with `call_next`, and gets the response back on the way out, so it can time requests or add
headers. It runs for every request, even `404`s:

```python
import asyncio
import time
import uuid

import httpx
from fastapi import FastAPI, Request

app = FastAPI()


@app.middleware("http")
async def request_id_and_timing(request: Request, call_next):
    request.state.request_id = uuid.uuid4().hex
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Process-Time-Ms"] = f"{(time.perf_counter() - started) * 1000:.1f}"
    return response


@app.get("/orders/{order_id}")
def get_order(order_id: str, request: Request):
    return {"order_id": order_id, "request_id": request.state.request_id}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


for path in ["/orders/A1042", "/nowhere"]:
    response = call("GET", path)
    print(response.status_code, response.headers["x-request-id"], response.headers["x-process-time-ms"], response.json())
```

A request id ties together everything that happened for one request: the log lines, the error
report, and the complaint a customer sends with the id from the response. `request.state` is where
middleware leaves things for endpoints to read. With several middlewares, the one added *last* is
the outermost, so it runs first on the way in and last on the way out.

Middleware or a dependency? Middleware sees every request but knows nothing about routes,
parameters or types. A dependency runs only for the endpoints that ask for it, with full
validation. Timing, request ids and CORS are middleware; authentication and database sessions are
dependencies.

> [!JS]
> Coming from Express: this is `app.use((req, res, next) => ...)`, except `call_next` returns the
> response, so the code after it can change the response instead of hooking `res.on("finish")`.

## CORS as a concept

A browser won't let JavaScript on `https://shop.example.com` read a response from
`https://api.example.com` unless the API says that origin is allowed, through the
`Access-Control-Allow-Origin` header. For anything beyond a simple GET, the browser first sends a
**preflight** `OPTIONS` request asking permission. `CORSMiddleware` answers both:

```python
import asyncio

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://shop.example.com"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


@app.post("/orders", status_code=201)
def create_order():
    return {"created": True}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


for origin in ["https://shop.example.com", "https://evil.example"]:
    preflight = call("OPTIONS", "/orders", headers={"Origin": origin, "Access-Control-Request-Method": "POST"})
    print(origin, preflight.status_code, preflight.headers.get("access-control-allow-origin"))
```

CORS is a rule browsers enforce to protect their users. curl, scripts and other servers ignore it
completely, so it's never a substitute for authentication. List the exact origins of your own
front ends, and avoid `allow_origins=["*"]` for anything that uses cookies or keys.

## Routers: splitting the app

An `APIRouter` is a group of path operations with shared settings: a path prefix, OpenAPI tags,
and dependencies that apply to every route in it. You build the router in its own module and
include it in the app:

```text
bookings_api/
  main.py             create_app(), includes the routers
  settings.py         the Settings model
  dependencies.py     get_settings, current_account, get_session
  routers/
    bookings.py       router = APIRouter(prefix="/bookings", tags=["bookings"])
    admin.py          router = APIRouter(prefix="/admin", dependencies=[Depends(require_staff)])
```

Here are two such routers in one runnable block:

```python
import asyncio
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException


def require_staff(x_staff_key: Annotated[str | None, Header()] = None) -> None:
    if x_staff_key != "desk-key":
        raise HTTPException(401, "Staff only")


bookings = APIRouter(prefix="/bookings", tags=["bookings"])
admin = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_staff)])


@bookings.get("/{booking_id}")
def get_booking(booking_id: str):
    return {"booking_id": booking_id}


@admin.get("/stats")
def stats():
    return {"bookings_today": 12}


app = FastAPI()
app.include_router(bookings)
app.include_router(admin)


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


print(call("GET", "/bookings/B-1").json())
print(call("GET", "/admin/stats").status_code, call("GET", "/admin/stats", headers={"X-Staff-Key": "desk-key"}).json())
sorted(app.openapi()["paths"])
```

Paths inside a router are relative to its prefix, and every admin route is protected without a
single endpoint mentioning `require_staff`. Adding a route to that router can't forget the check.

> [!JS]
> Coming from Express: `APIRouter` is `express.Router()`, and `include_router` is
> `app.use("/admin", router)`. In NestJS terms, it's a controller with a route prefix and guards.

## Settings and an app factory

So far every example has had a module-level `app` and module-level data. That's convenient, and
it's a problem for tests: all of them share one app, one set of overrides and one store, and
settings are fixed when the module is imported. An **app factory** is a function that builds a
fresh app from settings (module 9's `Settings` model):

```python
import asyncio
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, Request
from pydantic import BaseModel


class Settings(BaseModel):
    service_name: str = "Tidewater bookings"
    max_party_size: int = 8


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def create_app(settings: Settings) -> FastAPI:
    app = FastAPI(title=settings.service_name)
    app.state.settings = settings
    app.state.bookings = {}

    @app.get("/limits")
    def limits(settings: Annotated[Settings, Depends(get_settings)]):
        return {"max_party_size": settings.max_party_size}

    return app


def call(app, method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


small_boat = create_app(Settings(max_party_size=4))
ferry = create_app(Settings(service_name="Ferry bookings", max_party_size=40))
print(call(small_boat, "GET", "/limits").json(), call(ferry, "GET", "/limits").json())
small_boat.state.bookings is ferry.state.bookings
```

Each app carries its own settings and state on `app.state`, and dependencies reach them through
`request.app`. A test builds exactly the app it needs, and nothing leaks into the next test. In a
pytest suite, that's a fixture:

```python norun
@pytest.fixture
async def client():
    app = create_app(Settings(admin_key="test-admin-key", allowed_origins=[]))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
```

On your machine, the server still needs an app to import. Either end `main.py` with
`app = create_app(load_settings(os.environ))` and run `fastapi dev main.py` as before, or let
uvicorn call the factory itself with `uv run uvicorn main:create_app --factory --reload`.

## Where this leaves you

`BackgroundTasks` runs small jobs after the response is sent, in the same process. Middleware
wraps every request, which suits timing, request ids and CORS; dependencies suit anything specific
to an endpoint. CORS is a browser rule, answered by `CORSMiddleware`, and never a replacement for
auth. `APIRouter` groups routes with a shared prefix, tags and dependencies, and an app factory
builds a fresh, configured app for each deployment and each test. That's everything the capstone
needs.
