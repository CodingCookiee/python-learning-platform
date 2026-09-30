---
slug: fastapi-first-service
title: Your first web service
summary: A web service is a function the server calls once per request. FastAPI builds that function from your type hints, and hands you validation and docs for free.
minutes: 35
exercises:
  - api-health-check
  - api-predict-return-values
  - api-documented-service
  - api-raw-asgi-health
lab:
  title: Your service on localhost
  kind: output
  instructions: >-
    With uv run fastapi dev main.py running, run the command below in a second terminal and paste
    its output (on Windows PowerShell, type curl.exe). It should show the health check's JSON and
    the start of the OpenAPI schema.
  command: curl -s http://127.0.0.1:8000/health http://127.0.0.1:8000/openapi.json
  patterns:
    - '"status":\s*"ok"'
    - '"openapi":\s*"3\.\d+\.\d+"'
    - '"/health"'
---

In module 14 you were the client: you sent requests to someone else's API and made sense of what
came back. This module puts you on the other side. A **web service** is a program that waits for
HTTP requests and answers each one with a status code, some headers and usually a JSON body. By the
end of this lesson you'll know what actually happens between "a request arrives" and "your function
runs", and you'll have a small documented service answering requests in your browser.

## A request goes in, a response comes out

Two programs share the work of a Python web service. The **server** (uvicorn, most often) owns the
network socket: it accepts connections, reads raw bytes and turns them into a request. Your
**application** decides what the response is. The contract between the two is called **ASGI**, the
Asynchronous Server Gateway Interface, and it's surprisingly small. An ASGI app is an `async`
function that takes three arguments:

- `scope`, a dict describing the request: its method, path, query string and headers;
- `receive`, a coroutine you await to read the request body;
- `send`, a coroutine you call to send the response: first the status and headers, then the body.

Here's a complete ASGI app with no framework at all. The bottom half plays the part of the server:
`httpx.ASGITransport` hands requests straight to the app, in the same process, with no network.

```python
import asyncio
import json

import httpx


async def app(scope, receive, send):
    body = json.dumps({"method": scope["method"], "path": scope["path"]}).encode()
    await send({
        "type": "http.response.start",
        "status": 200,
        "headers": [(b"content-type", b"application/json")],
    })
    await send({"type": "http.response.body", "body": body})


async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/orders/1042")
        print(response.status_code, response.json())


asyncio.run(main())
```

Everything you'll build in this module is, in the end, a function like that one. Writing it by hand
means parsing paths, query strings and JSON yourself, and that's the work a framework does for you.

> [!JS]
> Coming from Node: ASGI plays the role of the `(req, res) => {}` handler that `http.createServer`
> calls. FastAPI sits on top of it the way Express or Fastify sits on top of `http`.

## FastAPI in five lines

With FastAPI, you create an `app` and register **path operations**: a method and a path, mapped
to an ordinary function. Whatever the function returns is converted to JSON.

```python
import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


def call(method, path, **kwargs):
    """Send one request to app, as a browser or curl would, and return the response."""
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


response = call("GET", "/health")
response.status_code, response.headers["content-type"], response.json()
```

`@app.get("/health")` means "when a GET request for `/health` arrives, call this function". There's
also `@app.post`, `@app.put`, `@app.patch` and `@app.delete`. The `app` object is itself an ASGI
app: FastAPI (built on a toolkit called Starlette) wrote the `scope`, `receive` and `send` part for
you.

The `call` helper at the bottom stands in for a client. Every example in this module ends with it,
so you can send requests and see the responses. It's the same `AsyncClient` you used in module 14,
pointed at the app instead of the internet.

```python
import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


for method, path in [("GET", "/health"), ("POST", "/health"), ("GET", "/status")]:
    response = call(method, path)
    print(method, path, response.status_code, response.json())
```

You didn't write the `405 Method Not Allowed` or the `404 Not Found`: FastAPI answers requests that
match no path operation for you.

## Type hints become validation

Parts of the path can be parameters, written in braces. Annotate the function's parameter, and
FastAPI converts the text from the URL to that type, or refuses the request:

```python
import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/orders/{order_id}")
def get_order(order_id: int):
    return {"order_id": order_id, "next": order_id + 1}


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


print(call("GET", "/orders/1042").json())
bad = call("GET", "/orders/latest")
print(bad.status_code, bad.json())
```

Everything in a URL is text, yet `order_id + 1` worked, because FastAPI passed an `int`. For
`latest`, your function never ran: FastAPI answered `422 Unprocessable Content` with a `detail` list
that names the location (`["path", "order_id"]`) and the problem. That's Pydantic from module 9,
doing its conversion and error reporting on every request.

```quiz
question: "With the app above, what status does `GET /orders/12.5` get?"
options:
  - "200, with order_id 12"
  - "200, with order_id 12.5"
  - "422"
  - "404"
answer: 2
explain: "The path matches /orders/{order_id}, so it isn't a 404. But \"12.5\" can't become an int without losing the .5, so Pydantic refuses it and FastAPI answers 422 before your function runs."
```

## The same hints become documentation

FastAPI also describes your API in **OpenAPI**, the standard JSON format for API descriptions. It
builds the description from the same decorators and hints, so the docs can't drift away from the
code. The title and version come from `FastAPI(...)`, a path operation's `summary=` and its
docstring describe it, and the parameters come from the signature:

```python
from fastapi import FastAPI

app = FastAPI(title="Bookings API", version="1.0.0")


@app.get("/rooms/{room_number}", summary="Look up a room")
def get_room(room_number: int):
    """Returns the room's floor and number."""
    return {"room_number": room_number, "floor": room_number // 100}


schema = app.openapi()
operation = schema["paths"]["/rooms/{room_number}"]["get"]
print(schema["info"])
print(operation["summary"], "-", operation["description"])
operation["parameters"]
```

On your machine, FastAPI serves this schema at `/openapi.json`, and renders it as interactive docs
at `/docs` (Swagger UI) and `/redoc`. Front-end developers and partners can read it, try requests
from the page, and generate typed clients from it.

## Testing without a server

Because `ASGITransport` talks to the app directly, it's also how you test a service: no port, no
server process, and every request runs your real routing, validation and code. In a real project
with pytest, you'd often use FastAPI's `TestClient`, a synchronous wrapper around the same idea:

```python norun
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

`TestClient` runs the app in a background thread, which the browser can't start. The drills on this
site use the async version instead, which is also what you'd pick locally when the tests themselves
need to `await` something. It's a plain `async def` test with the same arrange, act, assert shape:

```python
import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


async def test_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


asyncio.run(test_health())
print("test_health passed")
```

> [!JS]
> Coming from Node: this is supertest's `request(app).get("/health")`. The app is called in-process,
> and no port is opened.

## Do it on your machine

In the browser there's no server to start. On your machine, make a project and add FastAPI with
its standard extras, which include uvicorn and the `fastapi` command:

```bash
uv init bookings-api
cd bookings-api
uv add "fastapi[standard]"
```

Put the five-line app from above in `main.py` (without the `call` helper), then start the
development server:

```bash
uv run fastapi dev main.py
```

It prints the address, `http://127.0.0.1:8000`. Open `/health` in your browser, then `/docs`, and
try the request from the docs page. `fastapi dev` reloads the server whenever you save a file.
`fastapi run main.py` starts it without reloading, for production. Under the hood, both start
uvicorn, which you can also run yourself as `uv run uvicorn main:app --reload`: `main:app` means
"the `app` object in `main.py`".

**Check it:** with the server running, paste the output of
`curl -s http://127.0.0.1:8000/health http://127.0.0.1:8000/openapi.json` into the lab box below.

> [!JS]
> Coming from Express: there's no `app.listen(8000)` in your code. The server is a separate program
> that imports your app and calls it, which is exactly why tests can call it without one.

## Where this leaves you

A web service is an ASGI app: an async function the server calls once per request. FastAPI builds
that function from decorated path operations, converts return values to JSON, turns type hints into
validation with `422` errors, and describes everything in an OpenAPI schema. You test it with
`httpx.AsyncClient` over `ASGITransport`, and run it for real with `fastapi dev`. The drills start
with a health check and finish with an ASGI app written by hand.
