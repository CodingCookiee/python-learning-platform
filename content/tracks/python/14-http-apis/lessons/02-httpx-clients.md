---
slug: httpx-clients
title: Clients, timeouts and errors
summary: One httpx.Client per API, with a base URL, default headers and timeouts that are always set, and errors you catch by name.
minutes: 45
exercises:
  - http-predict-no-raise
  - http-shop-client
  - http-fix-no-timeout
  - http-find-order-errors
---

Calling an API once from the REPL is easy. Calling it ten thousand times a day from a job nobody
watches is where scripts fall over. A request hangs and the job never finishes. A `500` error page
gets read as if it were data. A single `404` crashes a run that should have skipped one record and
moved on. This lesson sets httpx up the way production code does: one client per API, timeouts
that are always set, and errors caught by name.

## One-off calls and clients

httpx has one-off functions, `httpx.get`, `httpx.post` and so on, that are fine in the REPL:

```python norun
import httpx

response = httpx.get("https://api.github.com/repos/python/cpython", timeout=10)
response.json()["stargazers_count"]
```

Each one opens a connection, does the TCP and TLS handshakes, sends one request and closes it
again. An `httpx.Client` keeps connections open and reuses them (**connection pooling**), so the
second request to the same host skips the handshakes. It also holds configuration you'd otherwise
repeat on every call. Use it as a context manager, so its connections are closed when you're done:

```python norun
import httpx

with httpx.Client(base_url="https://api.github.com", timeout=10) as client:
    for repo in ["cpython", "mypy", "typeshed"]:
        print(repo, client.get(f"/repos/python/{repo}").json()["stargazers_count"])
```

Here's the same loop against a fake GitHub, so you can run it:

```python
import httpx

STARS = {"cpython": 68000, "mypy": 19000, "typeshed": 4400}


def fake_github(request):
    repo = request.url.path.rsplit("/", 1)[-1]
    return httpx.Response(200, json={"name": repo, "stargazers_count": STARS[repo]})


with httpx.Client(base_url="https://api.github.com", timeout=10, transport=httpx.MockTransport(fake_github)) as client:
    for repo in ["cpython", "mypy", "typeshed"]:
        print(repo, client.get(f"/repos/python/{repo}").json()["stargazers_count"])
```

Only the `transport=` argument changed. That's the pattern for everything you write from here on:
functions take a **client** as a parameter instead of creating one, so production code passes a real
client and tests pass one with a fake transport.

## Base URL and default headers

`base_url` goes in front of every relative path, including any path prefix such as an API version.
`headers` are sent with every request, and a request can add its own or override one:

```python
import httpx


def echo(request):
    return httpx.Response(200, json={
        "url": str(request.url),
        "accept": request.headers["accept"],
        "user-agent": request.headers["user-agent"],
        "trace": request.headers.get("x-trace-id"),
    })


client = httpx.Client(
    base_url="https://api.shop.example/v2",
    headers={"Accept": "application/json", "User-Agent": "millstone-sync/1.0"},
    timeout=10,
    transport=httpx.MockTransport(echo),
)
print(client.get("/orders", params={"status": "paid"}).json())
print(client.get("/orders/1042", headers={"X-Trace-Id": "t-77"}).json())
```

`/orders` became `/v2/orders`: httpx joins the path onto the base URL's path rather than replacing
it. A full URL (`https://...`) skips the base URL altogether.

> [!TIP]
> Set a `User-Agent` that names your integration and a way to reach you. Some APIs (GitHub's among
> them) refuse requests without one, and when your job misbehaves at 3 a.m. it's how the provider
> knows who to contact instead of just blocking you.

## Timeouts: always set them

A server can accept your connection and then never answer. Without a timeout, your program waits
for it forever: the nightly job is still "running" in the morning. httpx defaults to 5 seconds,
which is better than no limit (the popular `requests` library waits forever by default), but a
default somebody else chose isn't a decision. Choose one per API and write it down:

```python norun
client = httpx.Client(base_url="https://api.shop.example/v2", timeout=httpx.Timeout(10, connect=3))
client.get("/exports/weekly", timeout=60)       # one slow endpoint gets longer
client.get("/orders", timeout=None)             # never do this: waits forever
```

`httpx.Timeout(10, connect=3)` allows 3 seconds to connect and 10 for each of the other phases:
**read** (waiting for data), **write** (sending the body) and **pool** (waiting for a free
connection). A fake server can't really hang, but it can raise exactly what httpx raises when the
read timeout runs out, and it can see which timeouts the request carried:

```python
import httpx


def slow_reports(request):
    print("timeouts:", request.extensions["timeout"])
    raise httpx.ReadTimeout("the server didn't answer in time", request=request)


client = httpx.Client(transport=httpx.MockTransport(slow_reports), timeout=httpx.Timeout(10, connect=3))
try:
    client.get("https://reports.crm.example/v1/exports/weekly")
except httpx.TimeoutException as error:
    print(type(error).__name__, "-", error)
```

> [!JS]
> Coming from JavaScript: `fetch` has no timeout option; you pass `signal: AbortSignal.timeout(10_000)`
> and catch the abort. httpx has timeouts built in, one per phase, and raises `httpx.TimeoutException`.

> [!WARNING]
> The read timeout applies to each wait for data, not to the whole request. A server that trickles
> out one byte every few seconds never trips it. When you need a hard deadline on the whole call,
> wrap it (in async code, `asyncio.timeout()`, lesson 6).

## Reading a response

A response gives you `status_code`, `headers`, the body as `text` or raw `content`, and `json()` to
parse it. `json()` only works if the body really is JSON, and error responses often aren't: a load
balancer in front of the API answers a `502` with an HTML page.

```python raises
import httpx


def gateway(request):
    return httpx.Response(502, text="<html><h1>502 Bad Gateway</h1></html>", headers={"Content-Type": "text/html"})


client = httpx.Client(transport=httpx.MockTransport(gateway), timeout=10)
response = client.get("https://api.shop.example/v2/orders/1042")
print(response.status_code, response.headers["content-type"])
response.json()
```

`json()` raises `json.JSONDecodeError`, which is a kind of `ValueError`. Check the status before
you parse the body, and you'll rarely meet it.

## raise_for_status

httpx does **not** raise an exception for a `404` or a `500`. It got a valid HTTP response, so as far
as httpx is concerned the request worked. Deciding whether that status is a problem is your job, and
`raise_for_status()` is the standard way to do it: it raises `httpx.HTTPStatusError` for any `4xx`
or `5xx`, and otherwise returns the response, so it chains:

```python
import httpx


def shop(request):
    if request.url.path == "/v2/orders/1042":
        return httpx.Response(200, json={"id": 1042, "status": "paid"})
    return httpx.Response(404, json={"error": "order not found"})


client = httpx.Client(transport=httpx.MockTransport(shop), base_url="https://api.shop.example/v2", timeout=10)
print(client.get("/orders/1042").raise_for_status().json())
try:
    client.get("/orders/9999").raise_for_status()
except httpx.HTTPStatusError as error:
    print(error.response.status_code, error.response.json(), error.request.url)
```

The exception carries both the `request` and the `response`, so a handler can read the status, the
error body and the URL.

> [!JS]
> Coming from JavaScript: this is `fetch`, not axios. `fetch` resolves on a `404` with
> `response.ok === false`; httpx returns it with `response.is_success == False`. Until you call
> `raise_for_status()`, an error page is just a response.

```quiz
question: "The shop answers `GET /orders/9999` with `404` and `{\"error\": \"order not found\"}`. What does `client.get(\"/orders/9999\").json()` do?"
options:
  - Raises httpx.HTTPStatusError
  - "Returns {\"error\": \"order not found\"}"
  - Returns None
answer: 1
explain: "Nothing checks the status unless you call raise_for_status(). The 404's body is valid JSON, so json() happily returns it, and code that expected an order gets an error message instead."
```

## Catching errors by name

httpx's exceptions form a tree, and where you catch in it decides what you've handled:

```text
httpx.HTTPError
├── httpx.HTTPStatusError          raise_for_status() saw a 4xx or 5xx: you got an answer
└── httpx.RequestError             you got no usable answer at all
    └── httpx.TransportError
        ├── httpx.TimeoutException     ConnectTimeout, ReadTimeout, WriteTimeout, PoolTimeout
        └── httpx.NetworkError         ConnectError, ReadError, WriteError, CloseError
```

Catch the narrowest error you can do something about, and let everything else propagate:

```python
import httpx


def flaky_shop(request):
    order_id = request.url.path.rsplit("/", 1)[-1]
    if order_id == "1042":
        return httpx.Response(200, json={"status": "paid"})
    if order_id == "1043":
        raise httpx.ReadTimeout("no answer", request=request)
    if order_id == "1044":
        raise httpx.ConnectError("connection refused", request=request)
    return httpx.Response(404, json={"error": "order not found"})


def order_status(client, order_id):
    try:
        return client.get(f"/orders/{order_id}").raise_for_status().json()["status"]
    except httpx.HTTPStatusError as error:
        if error.response.status_code == 404:
            return "no such order"
        raise
    except httpx.TimeoutException:
        return "the shop is slow, try again later"
    except httpx.ConnectError:
        return "can't reach the shop"


client = httpx.Client(transport=httpx.MockTransport(flaky_shop), base_url="https://api.shop.example/v2", timeout=10)
for order_id in ["1042", "1043", "1044", "9999"]:
    print(order_id, order_status(client, order_id))
```

A `404` is expected and gets its own answer; any other status is re-raised, because this function
has no sensible answer for a `401`.

> [!WARNING]
> Don't wrap a request in `except Exception:`. A `KeyError` from a typo in your own parsing code
> would be reported as "can't reach the shop", and you'd spend an hour debugging the network.

## Where this leaves you

Make one `httpx.Client` per API, with its base URL, default headers and a timeout you chose, and
pass it into the functions that need it so tests can hand them a fake. httpx doesn't raise for error
statuses until you call `raise_for_status()`. Catch `HTTPStatusError` when you got an answer you
didn't like, `TimeoutException` and `ConnectError` when you got none, and nothing broader. The
drills cover each of those, ending with a function that turns every kind of failure into one error
of its own.
