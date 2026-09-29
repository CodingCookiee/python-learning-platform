---
slug: pagination
title: Pagination
summary: Offset, cursor and Link-header pagination, written once as a lazy generator that fetches a page only when it's needed.
minutes: 40
exercises:
  - http-next-link
  - http-offset-invoices
  - http-fix-missing-last-page
  - http-link-header-repos
  - http-safe-cursor-pages
---

No API sends you 80,000 invoices in one response. It sends a **page**, 50 or 100 at a time, and
tells you how to ask for the next one. Three schemes cover nearly every API you'll meet, and the
code that follows them always has the same shape: fetch a page, hand over its items, decide whether
to go on. A generator is the natural way to write that, because the caller gets a plain iterable of
items and never has to think about pages at all.

## Offset and limit

The oldest scheme: you say where to start and how many you want, and the response usually says how
many there are in total.

```text
GET /v1/invoices?offset=0&limit=100    →  {"data": [...100 invoices...], "total": 250}
GET /v1/invoices?offset=100&limit=100  →  {"data": [...100 invoices...], "total": 250}
GET /v1/invoices?offset=200&limit=100  →  {"data": [...50 invoices...],  "total": 250}
```

```python
import httpx

INVOICES = [{"id": f"inv_{n:03}", "amount": n * 10} for n in range(1, 8)]


def billing(request):
    offset = int(request.url.params.get("offset", 0))
    limit = int(request.url.params.get("limit", 100))
    print("server: offset", offset, "limit", limit)
    return httpx.Response(200, json={"data": INVOICES[offset : offset + limit], "total": len(INVOICES)})


client = httpx.Client(transport=httpx.MockTransport(billing), base_url="https://api.billing.example", timeout=10)
invoices = []
offset = 0
while True:
    page = client.get("/v1/invoices", params={"offset": offset, "limit": 3}).raise_for_status().json()
    invoices.extend(page["data"])
    offset += 3
    if offset >= page["total"]:
        break
[invoice["id"] for invoice in invoices]
```

Some APIs number pages instead (`?page=3&per_page=50`); it's the same idea. The weakness of both is
that positions move. If an invoice is deleted while you're on page 1, everything shifts up by one,
and the first invoice of page 2 slides onto page 1, where you've already been. You never see it.

## Cursor pagination

A **cursor** is a bookmark the server gives you: an opaque string that means "the page after this
one". You don't compute it, you just send it back:

```text
GET /v1/contacts?limit=50                →  {"data": [...], "has_more": true,  "next_cursor": "c_50"}
GET /v1/contacts?limit=50&cursor=c_50    →  {"data": [...], "has_more": true,  "next_cursor": "c_100"}
GET /v1/contacts?limit=50&cursor=c_100   →  {"data": [...], "has_more": false, "next_cursor": null}
```

Because the cursor points at a record, not a position, inserts and deletes don't make you skip
anything. The trade-off is that you can't jump straight to page 40. Field names vary (Stripe says
`starting_after`, Slack says `next_cursor`), but the loop is always the same:

```python
import httpx

CONTACTS = [f"contact {n}" for n in range(1, 6)]


def crm(request):
    start = int(request.url.params.get("cursor", "c_0").removeprefix("c_"))
    limit = int(request.url.params["limit"])
    end = start + limit
    has_more = end < len(CONTACTS)
    return httpx.Response(200, json={"data": CONTACTS[start:end], "has_more": has_more, "next_cursor": f"c_{end}" if has_more else None})


client = httpx.Client(transport=httpx.MockTransport(crm), base_url="https://api.crm.example", timeout=10)
params = {"limit": 2}
while True:
    page = client.get("/v1/contacts", params=params).raise_for_status().json()
    print(params.get("cursor"), page["data"])
    if not page["has_more"]:
        break
    params["cursor"] = page["next_cursor"]
```

## Link headers

Some APIs, GitHub's among them, put the next page's URL in a `Link` header instead of the body:

```text
Link: <https://api.github.com/organizations/1/repos?per_page=30&page=2>; rel="next",
      <https://api.github.com/organizations/1/repos?per_page=30&page=5>; rel="last"
```

httpx parses it for you into `response.links`, a dict keyed by `rel`. Follow the `next` URL exactly
as given, query string and all; don't rebuild it from pieces. A relative URL (`</repos?page=2>`) is
relative to the URL you just fetched, and `response.url.join(...)` makes it absolute:

```python
import httpx


def fake_github(request):
    page = int(request.url.params.get("page", 1))
    headers = {}
    if page < 3:
        headers["Link"] = f'<https://api.github.com/orgs/acme/repos?per_page=2&page={page + 1}>; rel="next"'
    return httpx.Response(200, json=[f"repo-{page}a", f"repo-{page}b"], headers=headers)


client = httpx.Client(transport=httpx.MockTransport(fake_github), timeout=10)
url = "https://api.github.com/orgs/acme/repos?per_page=2"
while url:
    response = client.get(url).raise_for_status()
    print(response.json(), "next:", response.links.get("next", {}).get("url"))
    url = response.links.get("next", {}).get("url")
```

## Pagination as a generator

Every loop above builds a list, so the caller waits for every page before seeing the first item,
and holds them all in memory. Module 8's answer: make it a generator. `yield from` hands over one
page's items, and the next page is fetched only when the caller asks for more:

```python
from itertools import islice

import httpx

INVOICES = [{"id": f"inv_{n:03}", "amount": n * 10} for n in range(1, 251)]


def billing(request):
    offset = int(request.url.params["offset"])
    limit = int(request.url.params["limit"])
    print("server: page at offset", offset)
    return httpx.Response(200, json={"data": INVOICES[offset : offset + limit], "total": len(INVOICES)})


def iter_invoices(client, limit=100):
    offset = 0
    while True:
        page = client.get("/v1/invoices", params={"offset": offset, "limit": limit}).raise_for_status().json()
        yield from page["data"]
        offset += limit
        if offset >= page["total"] or not page["data"]:
            break


client = httpx.Client(transport=httpx.MockTransport(billing), base_url="https://api.billing.example", timeout=10)
first_five = [invoice["id"] for invoice in islice(iter_invoices(client), 5)]
print(first_five)
print(sum(invoice["amount"] for invoice in iter_invoices(client)))
```

Taking five invoices fetched one page, and summing all of them fetched three. The caller wrote
ordinary Python (`islice`, `sum`, a `for` loop) and the pagination is invisible. It also checks
`not page["data"]`: if the `total` is ever wrong, an empty page still ends the loop.

```quiz
question: "iter_contacts(client) pages through 10,000 contacts, 100 at a time. How many requests does next(iter_contacts(client)) make?"
options:
  - "0"
  - "1"
  - "100"
answer: 1
explain: "A generator runs only as far as its first yield. That's after the first page arrives, so one request is made, and the other 99 pages are never fetched."
```

## The page that never arrives

The classic pagination bug decides whether to stop **before** using the page it just fetched:

```python
import httpx

ORDERS = [f"order {n}" for n in range(1, 8)]


def shop(request):
    offset = int(request.url.params["offset"])
    return httpx.Response(200, json={"data": ORDERS[offset : offset + 3]})


def iter_orders(client, limit=3):
    offset = 0
    while True:
        page = client.get("/v1/orders", params={"offset": offset, "limit": limit}).raise_for_status().json()
        if len(page["data"]) < limit:     # a short page means it's the last one...
            break                         # ...so this throws the last page away
        yield from page["data"]
        offset += limit


client = httpx.Client(transport=httpx.MockTransport(shop), base_url="https://api.shop.example", timeout=10)
list(iter_orders(client))
```

Seven orders, and `order 7` is missing: it arrived on the last page, and the check threw it away.
Whatever the scheme, the rule is the same: **use the page first, then decide whether there's
another**. It's an easy bug to miss, because it only shows when the total isn't a multiple of the
page size, and small test data often fits on one page, which the buggy version drops entirely.

> [!WARNING]
> A buggy server can hand back the same cursor forever, and a `while True` loop will follow it
> forever. Production code keeps a limit on the number of pages, or remembers the cursors it has
> seen. The stretch drill does both.

## Where this leaves you

Offset pagination counts positions, cursor pagination follows a bookmark, and Link headers put the
next URL in a header that httpx parses into `response.links`. Whichever you meet, write it once as a
generator that yields items, uses each page before deciding whether to fetch another, and stops on
an empty page. Callers then take as many items as they need, and only those pages are fetched.
