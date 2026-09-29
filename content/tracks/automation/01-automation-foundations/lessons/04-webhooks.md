---
slug: webhooks
title: Receiving webhooks safely
summary: Accept webhooks in FastAPI that verify HMAC signatures over the raw body, reject replays, ignore duplicate deliveries and acknowledge in milliseconds.
minutes: 55
exercises:
  - auto-sign-webhook
  - auto-fix-signature-compare
  - auto-fix-duplicate-delivery
  - auto-verify-webhook
  - auto-fix-signed-parsed-json
  - auto-webhook-endpoint
---

A marketing agency runs lead forms for a dozen clients. Today an assistant copies each submission
from the form tool into the CRM, usually within the hour, sometimes the next morning. The agency
wants every lead in the CRM, and in the account manager's Slack, within seconds. The form tool can
send a **webhook**: an HTTP request to a URL you choose, every time a form is submitted. You built
FastAPI services in module 15. A webhook receiver is a small one, but it has to do four things
right, or it will lose leads, duplicate them, or accept fakes. This lesson takes them one at a time.

## A webhook is someone else's POST

When a form is submitted, the form tool sends a `POST` with a JSON body to your URL. Almost every
provider sends the same shape: an event **id**, an event **type**, a timestamp, and the data.

```python
import httpx
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhooks/forms")
async def form_submitted(request: Request):
    raw = await request.body()           # the exact bytes the sender sent
    print("event:", request.headers["webhook-id"], len(raw), "bytes")
    return {"ok": True}

body = b'{"id":"evt_1042","type":"form.submitted","data":{"email":"amira@example.com"}}'
async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
    response = await client.post(
        "/webhooks/forms",
        content=body,
        headers={"Content-Type": "application/json", "Webhook-Id": "evt_1042"},
    )
response.status_code, response.json()
```

Notice that the handler reads `request.body()`, not a Pydantic model parameter. A Pydantic
parameter would parse the JSON before your code runs, and the next three sections all need the raw
bytes first.

> [!JS]
> Coming from Express: this is why webhook routes use `express.raw({ type: "application/json" })`
> instead of `express.json()`. The signature is over the bytes, and a parsed body can't give them back.

## Anyone can POST to your URL

Your webhook URL isn't a secret for long: it's in the form tool's settings, in logs, in a
screenshot. Anyone who finds it can send "a lead was submitted" with whatever data they like. So
the sender **signs** each request. You and the sender share a secret, and the sender computes an
**HMAC** (a hash keyed with the secret) over the request, and puts it in a header. Only someone who
knows the secret can produce a matching HMAC, and changing a single byte of the body changes it
completely.

The scheme in this module is the one Stripe popularised, and many providers follow it: the signed
message is the timestamp, a dot, and the raw body, and the header carries both.

```python
import hashlib
import hmac

secret = "test-secret-agency"          # in real code: os.environ["FORMS_WEBHOOK_SECRET"]
timestamp = 1773072000
body = b'{"id":"evt_1042","type":"form.submitted"}'

signature = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
header = f"t={timestamp},v1={signature}"
header
```

Providers differ in the details (the header's name, hex or base64, what exactly is signed), so the
first job with any new provider is reading its webhook docs. The principle is always this one.

## Compare in constant time

The receiver computes the same HMAC and compares. The obvious comparison is wrong:

```python norun
if expected == received:        # leaks how many leading characters were right
    ...
```

`==` on strings stops at the first character that differs. A wrong guess whose first character is
right takes a few nanoseconds longer to reject than one whose first character is wrong. Over many
thousands of requests an attacker can measure that, and recover a valid signature a character at a
time. `hmac.compare_digest` takes the same time however much of the input matches:

```python
import hmac

expected = "166aabaff8fd6e846db23e08e70c60d4"
hmac.compare_digest(expected, "166aabaff8fd6e846db23e08e70c60d4"), hmac.compare_digest(expected, "0" * 32)
```

> [!JS]
> Node's equivalent is `crypto.timingSafeEqual(a, b)`, which takes two Buffers of equal length.

## Sign the bytes, not the JSON

A tempting shortcut: parse the body, then re-serialise it to check the signature. It fails on real
traffic, because JSON has many byte-level spellings of the same data:

```python
import json

sent = b'{"name":"Zo\xc3\xab","email":"zoe@example.com"}'     # what the sender signed
again = json.dumps(json.loads(sent)).encode()
sent == again, again
```

The spaces changed, and `ë` became `ë`. Key order, number formatting and escaping all vary
between languages too. Verify the raw bytes, and parse them only once the signature has checked out.

## Timestamps stop replays

A valid signed request is valid for ever, unless something expires it. An attacker who captures one
(from a proxy log, say) can **replay** it a thousand times. That's why the timestamp is inside the
signed message: the receiver rejects any request whose timestamp is more than a few minutes from
its own clock, in either direction, and the attacker can't change the timestamp without breaking
the signature.

```python
now = 1773072000 + 290            # your clock, in Unix seconds
tolerance = 300                   # five minutes, the common default
sent_at = 1773072000
abs(now - sent_at) <= tolerance
```

Allow for the future as well as the past: the sender's clock can be a little ahead of yours.

```quiz
question: "An attacker captured a correctly signed webhook from yesterday and edits its `t=` value to the current time before replaying it. What happens?"
options:
  - "It's accepted: the timestamp is now within tolerance"
  - "It's rejected: the signature was computed over the old timestamp, so it no longer matches"
  - "It's accepted, unless the event id was seen before"
answer: 1
explain: "The timestamp is part of the signed message. Changing it without the secret breaks the HMAC, so the check fails before tolerance even matters. Deduplication by event id is a second, separate defence."
```

## Deliveries repeat: idempotency

Webhook providers promise **at-least-once** delivery, not exactly once. If your response is slow,
or lost on the way back, the sender can't tell whether you processed the event, so it sends it
again. Your handler will see the same event twice, and a naive one creates two CRM contacts and two
Slack alerts.

The fix is an **idempotency key**: the event id. Record every id you've processed, and skip the ones
you've seen. In production that record is a database table with the id as primary key, so two
simultaneous deliveries can't both win:

```python
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE processed_events (id TEXT PRIMARY KEY, received_at TEXT)")

def first_time(event_id):
    cursor = db.execute(
        "INSERT OR IGNORE INTO processed_events VALUES (?, datetime('now'))", (event_id,)
    )
    return cursor.rowcount == 1       # 0 means the id was already there

[first_time("evt_1042"), first_time("evt_1042"), first_time("evt_1043")]
```

When you record the id matters. Record it **after** the work succeeds, and a crash halfway means
the retry does the work again (so make the work itself safe to repeat, an upsert rather than an
insert). Record it **before**, and a crash halfway means the retry is skipped and the lead is lost.
For leads, repeating is the lesser evil.

## Acknowledge fast, work later

Senders wait only a few seconds for your response (from 5 to 30, depending on the provider), then
count the delivery as failed and retry. Enriching a lead, writing to the CRM and posting to Slack
can easily take longer, especially when one of them is having a slow day. So a receiver does the
minimum inline: verify, deduplicate, store the event, and answer `2xx`. The real work happens
afterwards:

- FastAPI's `BackgroundTasks` runs a function after the response is sent. Fine for small, cheap
  work, but it's lost if the process restarts.
- A **queue** survives restarts: a table of pending events that a worker polls, or Redis, SQS or a
  similar service. The receiver appends; a worker takes items, does the work and marks them done.

What you return tells the sender what to do next:

| You return | The sender |
|------------|------------|
| `200`, `202`, any `2xx` | considers it delivered |
| `400`, `401`, `422` | usually stops: retrying a bad request won't fix it |
| `500`, `503`, or no answer in time | retries later |

So answer `401` for a bad signature, `400` for a body you can't parse, and `2xx` for a duplicate
(you've already got it). Let an unexpected crash become a `500`, so the sender tries again.

```quiz
question: "Your receiver gets a duplicate delivery of an event it processed an hour ago. What should it return?"
options:
  - "409 Conflict, because it's a duplicate"
  - "200, because the event has already been handled"
  - "500, so the sender knows something is wrong"
answer: 1
explain: "From the sender's point of view the event is delivered; a 2xx stops the retries. A 409 or 500 would make many senders keep retrying something you've already done."
```

## Retries from the sender's side

When a delivery fails, senders retry with **exponential backoff**: each wait longer than the last,
up to a limit, over hours or days. Some disable the endpoint after enough failures, and email the
account owner. It's the same backoff you wrote for API clients in module 14, seen from the other end:

```python
delays = [min(60 * 2**attempt, 6 * 3600) for attempt in range(8)]
[f"{d // 60} min" for d in delays]
```

This is why the details above matter. A receiver that answers `500` for a bad signature gets the
same fake request eight more times. A receiver without deduplication processes every retry. And
when *you* send webhooks, to a client's system say, do what good senders do: sign the body, give
every event an id, retry on `5xx` and timeouts with backoff, and alert a person when you give up.

## Do it on your machine

1. Put the receiver from the first section in `receiver.py`, with the signature check added, and
   the secret read from an environment variable.
2. Run it: `uv add "fastapi[standard]"`, then `FORMS_WEBHOOK_SECRET=test-secret-agency uv run fastapi dev receiver.py`.
3. Write `send.py`, which signs a body with the same secret and posts it with httpx to
   `http://127.0.0.1:8000/webhooks/forms`. Run it, then change one byte of the body after signing
   and check you get a `401`.
4. Expose your local server to the internet with a tunnel, for example
   `cloudflared tunnel --url http://localhost:8000` or `ngrok http 8000`, and paste the public URL
   into a real form tool's webhook settings (Tally, Typeform and Jotform all have them). Submit the
   form and watch the request arrive.
5. Stop the server, submit the form again, and restart it a few minutes later. Look in the form
   tool's webhook log for the failed delivery and its retry.

## Where this leaves you

A webhook receiver reads the raw body, verifies an HMAC over the timestamp and those exact bytes
with `hmac.compare_digest`, rejects stale timestamps, skips event ids it has already processed, and
answers `2xx` quickly, leaving slow work to a background task or a queue. The drills build each check,
fix three classic bugs, and finish with a complete FastAPI receiver.
