---
slug: typed-api-client
title: Designing a typed API client
summary: Wrap an API in one class, with Pydantic models for its responses, one request method for auth, retries and errors, and an exception hierarchy of its own.
minutes: 50
exercises:
  - http-ticket-model
  - http-api-error-hierarchy
  - http-refactor-scattered-calls
  - http-typed-helpdesk-client
---

A real integration now has a lot of parts: a base URL, credentials, timeouts, retries, pagination,
error handling, and the shape of every response. Scatter them across a codebase and each one gets
written again, slightly differently, in every function that touches the API. The cure is the
pattern behind every good SDK, from Stripe's and GitHub's to the LLM providers': **one class that
owns the connection** and presents the API as typed methods. This lesson designs one for a
helpdesk API. The capstone builds a complete one for a CRM, and the automation track builds its
provider-neutral LLM client the same way.

## The trouble with scattered calls

Here are two helpdesk functions, written a month apart:

```python
import httpx


def helpdesk(request):
    if request.url.path == "/v2/tickets/4411":
        return httpx.Response(200, json={"id": 4411, "subject": "Refund not received", "status": "open"})
    return httpx.Response(404, json={"error": {"message": "ticket not found"}})


def get_ticket(api_key, ticket_id, transport=None):
    client = httpx.Client(base_url="https://api.helpdesk.example/v2", headers={"Authorization": f"Bearer {api_key}"}, timeout=10, transport=transport)
    return client.get(f"/tickets/{ticket_id}").json()


def close_ticket(api_key, ticket_id, transport=None):
    client = httpx.Client(base_url="https://api.helpdesk.example/v2", headers={"Authorization": f"Bearer {api_key}"}, transport=transport)
    response = client.patch(f"/tickets/{ticket_id}", json={"status": "closed"})
    response.raise_for_status()
    return response.json()


transport = httpx.MockTransport(helpdesk)
ticket = get_ticket("hd_live_3b1f", 9999, transport)
ticket
```

`get_ticket` never checks the status, so a missing ticket comes back as a "ticket" holding an error
message, and the caller finds out later with a `KeyError`. `close_ticket` forgot the timeout. Both
open a new client, and so a new connection, on every call, and to add retries you'd have to edit
every function. And every caller works with plain dicts, where `ticket["assigne"]` is a typo that
only fails at runtime.

## The shape of a client class

```python norun
class HelpdeskClient:
    def __init__(self, api_key, *, base_url="https://api.helpdesk.example/v2", transport=None): ...
    def close(self): ...
    def __enter__(self): ...
    def __exit__(self, *exc_info): ...

    def _request(self, method, path, **kwargs) -> httpx.Response: ...   # the one place

    def get_ticket(self, ticket_id: int) -> Ticket: ...
    def iter_tickets(self, status: str = "open") -> Iterator[Ticket]: ...
    def add_comment(self, ticket_id: int, body: str) -> Comment: ...
```

Four rules make this work:

1. **The constructor takes credentials and a transport.** It doesn't read environment variables
   (the caller does, or a `from_env` classmethod), and the `transport` parameter is how tests hand
   it a fake server. It creates **one** `httpx.Client`, which every method shares.
2. **`_request` is the only method that sends anything.** Auth, timeouts, retries, logging and
   error handling live there, once. Fix a bug in it and every method is fixed.
3. **Public methods are thin and typed.** Each one builds a path and a body, calls `_request`, and
   returns a model. They read like the API's documentation.
4. **It's a context manager**, so `with HelpdeskClient(key) as helpdesk:` closes its connections.

```quiz
question: "The helpdesk API starts answering 503 for a few seconds during its deploys. In a client class built this way, where do you add retries?"
options:
  - In every public method that might hit a 503
  - Once, in _request
  - In the code that calls the client
answer: 1
explain: "Every request goes through _request, so retrying there covers every method, including ones written next year. Callers shouldn't have to know the API is flaky."
```

## Models for responses

A Pydantic model per resource turns "a dict that probably has these keys" into a typed object that
definitely does, checked the moment the response arrives. Model the fields you use; unknown ones
are ignored by default, so the provider adding a field doesn't break you:

```python
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Ticket(BaseModel):
    id: int
    subject: str
    status: Literal["open", "pending", "closed"]
    created_at: datetime
    assignee: str | None = None


raw = {"id": 4411, "subject": "Refund not received", "status": "open", "created_at": "2026-09-28T14:03:00Z", "sla_policy": "gold"}
ticket = Ticket.model_validate(raw)
ticket.created_at.hour, ticket.assignee
```

Callers get attribute access, autocompletion and mypy checking: `ticket.assigne` is now an error
before the code runs. If the API ever sends something that doesn't fit (a new status, a missing
field), `model_validate` raises a `ValidationError` right at the edge of your program, which is far
easier to debug than a wrong value three functions later.

## An exception hierarchy of your own

Callers of your client shouldn't need to know it uses httpx: they should be able to catch
`NotFoundError`, or everything the helpdesk can throw at them, without importing anything else.
Give the client its own exceptions, arranged so each level is useful to catch:

```text
HelpdeskError                     anything this client raises
├── HelpdeskApiError              the API answered with an error status (.status_code, .request_id)
│   ├── BadRequestError           400, 422: the request was wrong
│   ├── AuthenticationError       401, 403: the credentials were wrong
│   ├── NotFoundError             404
│   ├── RateLimitError            429 (.retry_after)
│   └── ServerError               5xx
└── HelpdeskConnectionError       no answer at all: timeouts, refused connections
```

Turning a response into the right exception is one small function:

```python
import httpx


class HelpdeskError(Exception):
    pass


class HelpdeskApiError(HelpdeskError):
    def __init__(self, message, *, status_code):
        super().__init__(f"HTTP {status_code}: {message}")
        self.message = message
        self.status_code = status_code


class NotFoundError(HelpdeskApiError):
    pass


class ServerError(HelpdeskApiError):
    pass


def error_from_response(response):
    if response.status_code == 404:
        cls = NotFoundError
    elif response.is_server_error:
        cls = ServerError
    else:
        cls = HelpdeskApiError
    try:
        message = response.json()["error"]["message"]
    except (ValueError, KeyError, TypeError):
        message = response.reason_phrase
    return cls(message, status_code=response.status_code)


for response in [
    httpx.Response(404, json={"error": {"message": "ticket 9999 not found"}}),
    httpx.Response(502, text="<html>Bad Gateway</html>"),
    httpx.Response(409, json={"error": {"message": "ticket is already closed"}}),
]:
    error = error_from_response(response)
    print(type(error).__name__, "|", error, "|", isinstance(error, HelpdeskError))
```

Transport errors become `HelpdeskConnectionError`, raised `from` the httpx exception so the
original is still in the traceback. A body that isn't JSON (the `502` above) still gets a sensible
message.

## Putting it together in _request

Here's a small but complete client: one `httpx.Client`, auth in one place, retries for idempotent
requests only, errors mapped to the hierarchy, and a typed method on top.

```python
import time
from datetime import datetime
from typing import Literal

import httpx
from pydantic import BaseModel


class Ticket(BaseModel):
    id: int
    subject: str
    status: Literal["open", "pending", "closed"]
    created_at: datetime


class HelpdeskError(Exception):
    pass


class HelpdeskConnectionError(HelpdeskError):
    pass


class HelpdeskApiError(HelpdeskError):
    def __init__(self, message, *, status_code):
        super().__init__(f"HTTP {status_code}: {message}")
        self.status_code = status_code


RETRY_STATUSES = {429, 500, 502, 503, 504}


class HelpdeskClient:
    def __init__(self, api_key, *, transport=None, attempts=3, sleep=time.sleep):
        self._http = httpx.Client(
            base_url="https://api.helpdesk.example/v2",
            headers={"Authorization": f"Bearer {api_key}", "User-Agent": "support-bot/2.1"},
            timeout=httpx.Timeout(10, connect=3),
            transport=transport,
        )
        self._attempts = attempts
        self._sleep = sleep

    def close(self):
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        self.close()

    def _request(self, method, path, **kwargs):
        attempts = self._attempts if method == "GET" else 1      # only retry what's idempotent
        for attempt in range(attempts):
            last = attempt == attempts - 1
            try:
                response = self._http.request(method, path, **kwargs)
            except httpx.TransportError as error:
                if last:
                    raise HelpdeskConnectionError(f"{method} {path}: no response") from error
            else:
                if response.is_success:
                    return response
                if response.status_code not in RETRY_STATUSES or last:
                    raise HelpdeskApiError(response.reason_phrase, status_code=response.status_code)
            self._sleep(2 ** attempt)

    def get_ticket(self, ticket_id: int) -> Ticket:
        return Ticket.model_validate(self._request("GET", f"/tickets/{ticket_id}").json())


flaky = iter([503, 200])


def helpdesk(request):
    status = next(flaky, 200)
    print("server:", request.method, request.url.path, "->", status)
    if status != 200:
        return httpx.Response(status)
    return httpx.Response(200, json={"id": 4411, "subject": "Refund not received", "status": "open", "created_at": "2026-09-28T14:03:00Z"})


waits = []
with HelpdeskClient("hd_live_3b1f", transport=httpx.MockTransport(helpdesk), sleep=waits.append) as helpdesk_client:
    ticket = helpdesk_client.get_ticket(4411)
ticket, waits
```

`get_ticket` is one line, and it's typed, retried, authenticated and error-mapped without saying
so. Notice the `attempts` line: a `POST` that times out may have been processed, so this client
sends non-idempotent requests once. (With idempotency keys, lesson 5, it could retry those too.)

> [!JS]
> Coming from JavaScript: this is the same design as an axios instance with interceptors, wrapped
> in a class. The difference is that the "interceptors" here are plain code in `_request`, which
> makes the order of auth, retries and error mapping explicit and easy to test.

## Testing a client

Because the constructor takes a `transport`, testing the client is exactly what this module's
drills have done all along: build a fake server as a handler, give the client
`httpx.MockTransport(handler)`, call a method, and assert on two things: what the server received
(method, path, query, headers, body) and what the method returned or raised. Test the unhappy
paths hardest. A client that works when the API works isn't the achievement; one that fails
clearly and safely when the API doesn't is.

```quiz
question: "A test for get_ticket passes a fake server that answers 404. What should it assert?"
options:
  - That httpx.HTTPStatusError is raised
  - That NotFoundError is raised, and the server received GET /v2/tickets/9999 with the bearer token
  - That the method returns None
answer: 1
explain: "The public contract is the client's own exception, not httpx's. Checking what the server received as well proves the method called the right endpoint with the right credentials."
```

## Where this leaves you

One client class per API: the constructor takes credentials and a transport and creates one
`httpx.Client`; `_request` is the single place for auth, timeouts, retries and error mapping;
public methods are thin, typed, and return Pydantic models; and the client raises its own exception
hierarchy, never httpx's. The drills build the models and the hierarchy, refactor scattered
functions into a class, and finish with a complete typed client, ready for the capstone.
