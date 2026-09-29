---
slug: http-in-five-minutes
title: HTTP in five minutes
summary: Requests and responses, methods and idempotency, status codes, headers, JSON bodies and query strings, seen from both ends.
minutes: 35
exercises:
  - http-predict-query-string
  - http-status-advice
  - http-fix-create-contact
  - http-weather-handler
---

Every API you'll call in this module and the automation track speaks HTTP: payment providers, CRMs,
GitHub, weather services and every LLM provider. The protocol is small. A client sends a
**request**, a server sends back a **response**, and that's all of it. This lesson spends about five
minutes on each part. It uses **httpx**, the library the rest of the module is built on, and a fake
server you write yourself, so every example runs on this page with no network.

## A request and a response

Here is a real HTTP exchange, as text on the wire. A CRM client creates a contact:

```text
POST /v1/contacts?source=webinar HTTP/1.1
Host: api.crm.example
Content-Type: application/json
Authorization: Bearer sk_live_4f9a...

{"name": "Ada Lovelace", "email": "ada@example.com"}
```

```text
HTTP/1.1 201 Created
Content-Type: application/json
Location: /v1/contacts/c_1042

{"id": "c_1042", "name": "Ada Lovelace", "email": "ada@example.com"}
```

The request has a **method** (`POST`), a **path** (`/v1/contacts`), a **query string**
(`source=webinar`), **headers**, and a **body**. The response has a **status code** (`201`) with a
reason phrase, its own headers, and a body. Everything in this module is about producing the first
message correctly and reading the second one carefully.

httpx models both as objects. You rarely build a `Request` by hand, but doing it once shows the
parts:

```python
import httpx

request = httpx.Request(
    "POST",
    "https://api.crm.example/v1/contacts",
    params={"source": "webinar"},
    json={"name": "Ada Lovelace", "email": "ada@example.com"},
)
request.method, str(request.url), request.headers["content-type"], request.content
```

`json=` did two jobs: it serialized the dict into the body and set `Content-Type` to say the body is
JSON.

> [!JS]
> Coming from JavaScript: `fetch(url, {method: "POST", body: JSON.stringify(data), headers: {"Content-Type": "application/json"}})`
> is three steps; httpx's `json=` does all three.

## A fake server in six lines

In httpx, the **transport** is the layer that actually sends bytes over the network.
`httpx.MockTransport` swaps it for a function of yours: it receives each `httpx.Request` and returns
an `httpx.Response`. Everything above the transport (building the URL, encoding JSON, parsing the
response, raising errors) is real httpx.

```python
import httpx


def crm_server(request):
    print("server got:", request.method, request.url.path, request.content)
    return httpx.Response(201, json={"id": "c_1042", "name": "Ada Lovelace"})


client = httpx.Client(transport=httpx.MockTransport(crm_server))
response = client.post("https://api.crm.example/v1/contacts", json={"name": "Ada Lovelace"})
response.status_code, response.json()
```

This is how every drill in this module is graded. The tests are fake servers that record what they
received, so they can check the method, the path, the headers and the body your code sent, as well
as what it did with the answer. It's also how you'll test your own API clients at work.

## Methods and idempotency

The method says what kind of thing the request does:

| Method | Means | Safe | Idempotent |
|--------|-------|------|------------|
| `GET` | read something | yes | yes |
| `HEAD` | like `GET`, headers only | yes | yes |
| `POST` | create something, or run an action | no | **no** |
| `PUT` | replace something with this body | no | yes |
| `PATCH` | change some fields | no | usually not |
| `DELETE` | remove something | no | yes |

**Safe** means it changes nothing on the server. **Idempotent** means sending it twice has the same
effect as sending it once. This matters the moment a request times out and you don't know whether
it arrived, which is lesson 5's subject. Retrying a `PUT` is harmless; retrying a `POST` might charge
a card twice.

```python
import httpx

contacts = {}


def crm_server(request):
    if request.method == "POST":
        contact_id = f"c_{len(contacts) + 1}"
        contacts[contact_id] = request.content
        return httpx.Response(201, json={"id": contact_id})
    if request.method == "PUT":
        contact_id = request.url.path.rsplit("/", 1)[-1]
        contacts[contact_id] = request.content
        return httpx.Response(200, json={"id": contact_id})
    return httpx.Response(405)


client = httpx.Client(transport=httpx.MockTransport(crm_server), base_url="https://api.crm.example")
for attempt in range(2):
    client.post("/v1/contacts", json={"name": "Ada"})
    client.put("/v1/contacts/c_9", json={"name": "Grace"})
sorted(contacts)
```

Two `POST`s made two contacts; two `PUT`s left one. (`base_url` is put in front of every path the
client requests; the next lesson covers it.)

```quiz
question: Which of these requests is safe to send twice?
options:
  - "POST /v1/charges with an amount"
  - "DELETE /v1/deals/d_7"
  - "POST /v1/emails/send"
answer: 1
explain: "DELETE is idempotent: once the deal is gone, deleting it again changes nothing (the second call might answer 404, but no extra harm is done). Both POSTs would repeat their action: a second charge, a second email."
```

## Status codes

The status code is a three-digit number, and its first digit tells you most of what you need:

| Range | Means | Whose move |
|-------|-------|------------|
| `2xx` | it worked | carry on |
| `3xx` | look elsewhere (a redirect, or "not modified") | follow it |
| `4xx` | the request was wrong | the client: fix it, don't just resend it |
| `5xx` | the server failed | the server: trying again later may work |

The ones you'll meet every week: `200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`,
`401 Unauthorized` (no valid credentials), `403 Forbidden` (valid credentials, not allowed),
`404 Not Found`, `409 Conflict`, `422 Unprocessable Entity` (valid JSON, invalid data),
`429 Too Many Requests`, `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`
and `504 Gateway Timeout`.

```python
import httpx

for code in [200, 201, 204, 304, 404, 422, 429, 503]:
    response = httpx.Response(code)
    print(code, response.reason_phrase, response.is_success, response.is_client_error, response.is_server_error)
```

`429` is the odd one out: it's a `4xx`, but the request wasn't wrong, you just sent too many. It's
the one client error that's worth retrying, after waiting.

## Headers

Headers are metadata about the message: what the body is (`Content-Type`), what you'd like back
(`Accept`), who you are (`Authorization`, `User-Agent`), where the new thing lives (`Location`), and
when to try again (`Retry-After`). Header names are **case-insensitive**, and httpx treats them that
way:

```python
import httpx

response = httpx.Response(
    201,
    headers={"Location": "/v1/contacts/c_1042", "X-Request-Id": "req_8f2a"},
    json={"id": "c_1042"},
)
response.headers["location"], response.headers["x-request-id"], response.headers.get("Retry-After")
```

`X-Request-Id` is worth logging: when you email an API provider's support, it's the first thing
they'll ask for.

## JSON bodies

Most APIs send and receive JSON. On the way out, `json=` encodes the body; on the way back,
`response.json()` decodes it. Two other body styles turn up often enough to know: `data=` sends a
**form** (OAuth token endpoints expect one), and `content=` sends raw bytes you've already encoded.

```python
import httpx

as_json = httpx.Request("POST", "https://api.crm.example/v1/contacts", json={"name": "Ada", "tags": ["vip"]})
as_form = httpx.Request("POST", "https://auth.crm.example/oauth/token", data={"grant_type": "client_credentials"})
for request in (as_json, as_form):
    print(request.headers["content-type"], request.content)
```

> [!WARNING]
> A server reads the body according to its `Content-Type`. Send JSON text with the wrong content
> type, or put the fields in the query string instead of the body, and the server either rejects it
> (`415 Unsupported Media Type`, `422`) or, worse, quietly ignores the fields.

## Query strings

The query string carries parameters for a `GET`: filters, page numbers, search terms. Pass them as
`params=` and httpx encodes them properly. Here is the wrong way first, an f-string:

```python
import httpx

company = "Marks & Spencer"
url = httpx.URL(f"https://api.crm.example/v1/companies?name={company}&limit=20")
dict(url.params)
```

The `&` inside the name ended the parameter, so the server would search for `"Marks "` and see a
strange parameter called `" Spencer"`. With `params=`, special characters are escaped, lists become
repeated keys, and non-ASCII text is encoded:

```python
import httpx

request = httpx.Request(
    "GET",
    "https://api.crm.example/v1/companies",
    params={"name": "Marks & Spencer", "tags": ["retail", "uk"], "city": "São Paulo"},
)
print(request.url)
request.url.params["name"], request.url.params.get_list("tags")
```

> [!TIP]
> Treat URLs as structured data, never as strings you glue together. The same goes for paths: an ID
> from a user that contains `/` or `?` changes which endpoint you call.

## Where this leaves you

A request is a method, a URL with a query string, headers and a body; a response is a status code,
headers and a body. `GET`, `PUT` and `DELETE` are idempotent and `POST` isn't. `2xx` worked, `4xx`
is the client's fault (except `429`), `5xx` is the server's. httpx encodes JSON with `json=`, forms
with `data=` and query strings with `params=`, and `MockTransport` lets you be the server. The
drills have you predict what httpx sends, act on status codes, fix a request that ignores the docs,
and write a fake server of your own.
