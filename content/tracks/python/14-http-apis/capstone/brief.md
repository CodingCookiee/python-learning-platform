Millstone Coffee's wholesale team keeps its café customers in Pipeline CRM: the people as
**contacts**, and every order they're chasing as a **deal**. They've written a handful of scripts
against its API over the past year (a Monday pipeline report, a lead importer, a "mark as won" tool)
and every script talks to the API in its own way. One forgets the timeout, one retries a `404`
forever, one put the API key in the URL and so in the logs, and last month the lead importer timed
out halfway through a create, was run again, and made eleven duplicate contacts.

They've asked you for one library that every script can share: `crm_client.py`, a typed client that
does the connection, authentication, retries, pagination and error handling properly, once. You'll
use all of this module: an `httpx.Client` with timeouts, bearer auth, Pydantic models for responses,
a custom exception hierarchy, cursor and Link-header pagination written as generators, retries with
backoff, jitter and `Retry-After`, and idempotency keys for creates.

The starter contains a complete fake Pipeline CRM (`CrmServer`), so the whole thing runs with no
network, in the browser or in your own editor, and a `main()` that does what the Monday scripts do.
The fake server fails on purpose four times during that run: a `503`, a `429` with `Retry-After`, a
timeout, and a create whose answer is lost after it was processed. Your client has to ride through
all four.

## A sample run

```text
$ python crm_client.py
CrmClient(base_url='https://api.pipelinecrm.example/v1', api_key='...41d8')

  (log) WARNING crm_client: GET /v1/contacts: HTTP 503, retry 1 of 3
7 contacts
  ct_001  Ada Lovelace       Kiln Cafe
  ct_002  Grace Hopper       Harbour Roasters
  ct_003  Linus Pauling      Beanstalk Deli
  ct_004  Margaret Hamilton  Orbit Bakery
  ct_005  Alan Turing        Bletchley Books
  ct_006  Katherine Johnson  Launchpad Cowork
  ct_007  Tim Berners-Lee    Web Cafe

  (log) WARNING crm_client: GET /v1/deals: HTTP 429, retry 1 of 3
Open pipeline
  lead        2   £3,350.00
  qualified   2   £2,900.00
  proposal    2   £8,600.00
  Won: 2 deals, £1,950.00

Importing leads
  (log) WARNING crm_client: POST /v1/contacts: ReadTimeout, retry 1 of 3
  added ct_008 Hedy Lamarr, with dl_010 for £350.00
  skipped GRACE@harbourroasters.example: HTTP 409: GRACE@harbourroasters.example is already a contact
  skipped rosalind at helixbakes: HTTP 422: 'rosalind at helixbakes' isn't an email address
  added ct_009 Claude Shannon, with dl_011 for £350.00

dl_004 'Orbit Bakery: filter coffee' is won, closed 29 Sep 2026 at 09:05
ct_004 is now tagged wholesale, vip
  (log) WARNING crm_client: GET /v1/contacts/ct_004: ReadTimeout, retry 1 of 3
Margaret Hamilton checked again after a slow answer
Refused: HTTP 422: a lost deal can't move to won (BadRequestError, req_0020)
Refused: HTTP 404: contact ct_999 not found (NotFoundError, req_0021)

Changed today: ct_004, ct_008, ct_009
The server saw 22 requests, 4 of them failed on purpose;
the client waited 4 times, and created 2 contacts, not one more.
```

Look at the import. Hedy Lamarr's create was processed, but the answer never arrived. The client
retried with the same idempotency key, the server recognised it and replayed the original answer,
and there's exactly one Hedy Lamarr. That last line is the one the wholesale team cares about most.

## The API

Everything is under `https://api.pipelinecrm.example/v1`, and every request needs
`Authorization: Bearer <api key>`. Error responses look like
`{"error": {"code": "not_found", "message": "contact ct_999 not found"}}`, and every response has an
`X-Request-Id` header. `CrmServer` in the starter is the full specification; read it when anything
here is unclear.

| Request | Answer |
|---------|--------|
| `GET /contacts?limit=<1-100>&cursor=<c>&updated_since=<ISO datetime>` | `{"data": [contacts], "next_cursor": "c_3"}`, and `next_cursor` is `null` on the last page |
| `GET /contacts/<id>` | a contact, or `404` |
| `POST /contacts` with `{"name", "email", "company", "tags"}` and an `Idempotency-Key` header | `201` and the contact; `409` for an email that's already a contact; `422` for an invalid one |
| `PATCH /contacts/<id>` with any of `name`, `company`, `tags` | `200` and the contact |
| `GET /deals?per_page=<n>&stage=<stage>` | a JSON list of deals, with a `Link` header whose `next` URL is the next page |
| `POST /deals` with `{"title", "contact_id", "amount": "350.00", "currency"}` and an `Idempotency-Key` | `201` and the deal, in stage `lead` |
| `PATCH /deals/<id>` with `{"stage": ...}` | `200` and the deal; `422` if it's already `won` or `lost` |

A contact is `{"id", "name", "email", "company", "tags", "created_at", "updated_at"}`. A deal is
`{"id", "title", "contact_id", "amount", "currency", "stage", "created_at", "closed_at"}`, with the
amount as a string (`"2100.00"`) so no penny is lost, and `closed_at` set once a deal is won or lost.

## Requirements

### Models

`Contact` and `Deal` are Pydantic models with exactly the fields above. Datetimes are `datetime`s,
`company` and `closed_at` may be `None`, `tags` defaults to an empty list, `Deal.amount` is a
`Decimal`, `currency` is `"GBP"`, `"EUR"` or `"USD"`, and `stage` is one of `"lead"`,
`"qualified"`, `"proposal"`, `"won"` and `"lost"`.

### Exceptions

```text
CrmError                       anything the client raises
├── CrmApiError                .message, .status_code, .code, .request_id
│   ├── BadRequestError        400, 422
│   ├── AuthenticationError    401, 403
│   ├── NotFoundError          404
│   ├── ConflictError          409
│   ├── RateLimitError         429, with .retry_after (seconds as a float, or None)
│   └── ServerError            500-599
└── CrmConnectionError         no response at all, raised from the httpx exception
```

`CrmApiError(message, *, status_code, code=None, request_id=None)`, and its `str()` is
`HTTP 404: contact ct_999 not found`. The message and code come from the error body; when the body
isn't in that format (an HTML error page from a proxy), the message is the reason phrase and the
code is `None`. Any other status is a plain `CrmApiError`.

### The client

```python
CrmClient(api_key, *, base_url=BASE_URL, transport=None, max_attempts=4, max_wait=60.0,
          sleep=time.sleep, rng=random, new_key=lambda: str(uuid.uuid4()))
```

- It creates **one** `httpx.Client` with the base URL, `Authorization: Bearer <api_key>`,
  `User-Agent: millstone-wholesale/1.0` and a timeout of 10 seconds (3 to connect). `close()`
  closes it, and the client is a context manager.
- `repr(client)` is `CrmClient(base_url='https://api.pipelinecrm.example/v1', api_key='...41d8')`:
  the last four characters of the key, or `'***'` for a key of 8 characters or fewer.

**`_request(method, url, *, idempotency_key=None, **kwargs)`** is the only method that sends
anything. `url` is a path such as `/contacts`, or a full URL from a `Link` header.

- With an `idempotency_key`, it adds the `Idempotency-Key` header.
- A `2xx` response is returned. Any other status raises the right `CrmApiError`.
- **What's retried:** `GET`, `PUT` and `DELETE`, and any request with an idempotency key, up to
  `max_attempts` requests in all. Anything else (the `PATCH`es) is sent once.
- **When:** on an `httpx.TransportError`, or a `429`, `500`, `502`, `503` or `504`.
- **How long to wait:** a `429` with `Retry-After` seconds waits exactly that long, unless it's more
  than `max_wait`, in which case the `RateLimitError` is raised straight away. Everything else waits
  with full jitter: `rng.uniform(0, min(30.0, 0.5 * 2 ** attempt))`, with attempts counted from 0.
  Waiting means calling `sleep(seconds)`. There's no wait after the last attempt.
- **Logging:** before each wait, one `WARNING` through the `crm_client` logger (the starter's `log`),
  saying what failed: `GET /v1/contacts: HTTP 503, retry 1 of 3`, or
  `GET /v1/contacts/ct_004: ReadTimeout, retry 1 of 3` for a transport error (the exception's class
  name). The path is the request URL's path, and `3` is `max_attempts - 1`.
- When the last attempt gets no response, it raises `CrmConnectionError("GET /v1/contacts/ct_004: no response")`
  from the httpx exception. No httpx exception ever escapes the client.

**The methods.** Each builds the request, calls `_request`, and returns models.

| Method | Does |
|--------|------|
| `get_contact(contact_id)` | `GET /contacts/<id>`, returns a `Contact` |
| `iter_contacts(*, updated_since=None, page_size=100)` | a generator of `Contact`s, following `next_cursor`; `updated_since` must be timezone-aware (a naive datetime raises `ValueError` before any request) and is sent in ISO format |
| `create_contact(name, email, *, company=None, tags=(), idempotency_key=None)` | `POST /contacts`, returns the `Contact` |
| `update_contact(contact_id, **changes)` | `PATCH /contacts/<id>` with the changes as the body, returns the `Contact` |
| `iter_deals(*, stage=None, per_page=50)` | a generator of `Deal`s: `GET /deals?per_page=...` (plus `stage` if given), then each `next` link exactly as given |
| `create_deal(title, contact_id, amount, currency="GBP", *, idempotency_key=None)` | `POST /deals` with the amount sent as a string to two places, returns the `Deal`; an amount that isn't a `Decimal` raises `TypeError` |
| `move_deal(deal_id, stage)` | `PATCH /deals/<id>` with `{"stage": stage}`, returns the `Deal` |

Both creates send an `Idempotency-Key`: the one given, or `new_key()`, called **once** per call and
reused for every retry of it.

## Getting started

1. Copy the starter into `crm_client.py`. Running it fails in `main()` until the client works;
   that's expected.
2. Write the models and check them against `CrmServer`'s sample data in the REPL:
   `Deal.model_validate(CrmServer().deals["dl_004"])`.
3. Write the exceptions and an `error_from_response(response)` function, as in lesson 7.
4. Write `__init__`, `close`, the context manager, `__repr__` and a first `_request` with no retries,
   then `get_contact`. Try it: `CrmClient(DEMO_KEY, transport=httpx.MockTransport(CrmServer(chaos=False)))`.
   `chaos=False` turns the planned failures off while you build.
5. Add the other methods, then the iterators, checking the requests `server.requests` received.
6. Add retries to `_request`, turn the chaos back on, and run `main()`. Compare it with the sample
   line by line.

## Try these

Before you submit, check each of these, with `sleep=waits.append` so nothing really waits:

- A client with the wrong key raises `AuthenticationError` from `get_contact("ct_001")`, after one
  request, and its message doesn't contain the key.
- A server that always answers `429` with `Retry-After: 3600` makes `get_contact` raise
  `RateLimitError` after one request, with `retry_after == 3600.0` and no waits.
- A server that always answers `503` makes `get_contact` raise `ServerError` after four requests
  and three waits, and `update_contact` raise it after one request.
- `create_contact("Ada Two", "ada2@example.com", idempotency_key="lead-42")`, called twice, returns
  the same contact both times and the server holds one new contact.
- `next(client.iter_contacts(page_size=2))` makes exactly one request, and
  `list(client.iter_deals(stage="lead", per_page=1))` returns the two leads in two requests, the
  second one to the first page's `next` link.
- `client.create_deal("Trial", "ct_001", 350.0)` raises `TypeError`, and
  `client.iter_contacts(updated_since=datetime(2026, 9, 29))` raises `ValueError` as soon as you ask
  it for a contact.
- Capture every log record at `DEBUG` (`logging.basicConfig(level=logging.DEBUG)` works) while
  `main()` runs: `DEMO_KEY` appears in none of them, even though httpx logs every request itself.

## Stretch goals

- **Async.** An `AsyncCrmClient` with the same methods over `httpx.AsyncClient`, with
  `await asyncio.sleep` injected, and a `create_contacts(leads, *, limit=5)` that imports many leads
  concurrently under a semaphore, reporting duplicates without stopping the batch.
- **One retry policy, two clients.** Move the "should I retry, and how long do I wait?" decision
  into a small class shared by the sync and async clients, so the rules are written once.
- **Stay under the limit.** The real Pipeline CRM sends `X-RateLimit-Remaining` and
  `X-RateLimit-Reset` headers. Teach `CrmServer` to send them, and have the client pause before the
  next request when the remaining count reaches zero, instead of waiting for a `429`.
- **Typed all the way.** Add type hints everywhere and make `mypy --strict crm_client.py` pass, with
  `Iterator[Contact]` and `Iterator[Deal]` for the generators.
- **Tests.** Write `test_crm_client.py` with pytest: one test per row of the method table, one per
  failure in "Try these", each building its own `CrmServer` and asserting on what it received.

## How to submit

Push `crm_client.py` and a short `README.md` (what it does, how to use it from a script, and how to
run the demo) to a GitHub repository, and submit its link on this capstone's page. The review runs
`python crm_client.py` and compares it with the sample run, runs hidden tests against a fresh
`CrmServer` (including failures the demo doesn't produce), captures every log record to look for
the key, and then reads your code against the criteria: one place for retries and errors, models
and exceptions of the client's own, lazy pagination that never drops a page, and creates that are
safe to retry.
