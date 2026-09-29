---
slug: retries-and-backoff
title: Retries, backoff and rate limits
summary: Retry only what's safe to retry, wait longer each time with jitter, respect Retry-After, and make POSTs safe to repeat with idempotency keys.
minutes: 50
exercises:
  - http-backoff-delay
  - http-retry-after-seconds
  - http-fix-retry-on-400
  - http-fix-ignored-retry-after
  - http-idempotent-charge
---

Networks fail in small ways all the time: a dropped connection, a server restarting during a
deploy, a load balancer answering `503` for two seconds. Most of these fix themselves if you wait
and try again. Others never will, and retrying them only wastes your time and the provider's
patience. This lesson is about telling the two apart, waiting the right amount between attempts,
and making sure a retry can't do something twice.

## What's worth retrying

Ask one question of every failure: would the **same request**, sent again in a moment, get a
different answer?

| Failure | Retry? | Why |
|---------|--------|-----|
| timeout, refused or dropped connection | yes | the network or server hiccupped |
| `429 Too Many Requests` | yes, after waiting | you were too fast, not wrong |
| `502`, `503`, `504` | yes | a server or gateway is briefly unavailable |
| `500 Internal Server Error` | a couple of times | often a bug that fails every time |
| `400`, `404`, `409`, `422` | **no** | the same request fails the same way |
| `401`, `403` | **no** | fix the credentials (or refresh a token once, as in lesson 3) |

That table fits in one function, and every retry loop in this lesson starts from it:

```python
import httpx

RETRY_STATUSES = {429, 500, 502, 503, 504}


def should_retry(error):
    if isinstance(error, httpx.TransportError):
        return True
    if isinstance(error, httpx.HTTPStatusError):
        return error.response.status_code in RETRY_STATUSES
    return False


request = httpx.Request("GET", "https://api.shop.example/v2/orders")
failures = {
    "timeout": httpx.ReadTimeout("slow", request=request),
    "refused": httpx.ConnectError("refused", request=request),
    "503": httpx.HTTPStatusError("503", request=request, response=httpx.Response(503, request=request)),
    "422": httpx.HTTPStatusError("422", request=request, response=httpx.Response(422, request=request)),
    "a bug": KeyError("status"),
}
{name: should_retry(error) for name, error in failures.items()}
```

A `KeyError` from your own code is never retried: it's a bug, and it will be a bug next time too.

## Exponential backoff

If a server is overloaded, retrying every 100 milliseconds makes it worse. **Exponential backoff**
waits longer after each failure, doubling from a base delay, up to a cap:

```python
def backoff(attempt, base=0.5, cap=30.0):
    return min(cap, base * 2 ** attempt)


[backoff(attempt) for attempt in range(8)]
```

Half a second, one, two, four, and so on: quick recovery from a blip, and a long pause for an
outage, without ever waiting absurdly long.

## Jitter

Now picture a thousand clients that all failed at 12:00:00 because the API restarted. With pure
backoff, all thousand retry at exactly 12:00:00.5, then all at 12:00:01.5: a **thundering herd**
that knocks the server over again each time. The fix is **jitter**: make each wait random. The
usual recipe, "full jitter", picks a delay anywhere between zero and the backoff:

```python
import random


def backoff_with_jitter(attempt, rng, base=0.5, cap=30.0):
    return rng.uniform(0, min(cap, base * 2 ** attempt))


rng = random.Random(7)
[round(backoff_with_jitter(attempt, rng), 2) for attempt in range(6)]
```

The waits still grow on average, but a thousand clients now spread their retries out instead of
arriving together.

## A retry loop you can test

Retry code has two things tests hate: real waiting and real randomness. So take both as
parameters. Production code uses the defaults, `time.sleep` and the `random` module itself (which
has a `uniform` function, just like a `random.Random` object); tests pass `waits.append` and a
seeded `random.Random`, so they run instantly and give the same answer every time.

```python
import random
import time

import httpx

RETRY_STATUSES = {429, 500, 502, 503, 504}


def get_with_retries(client, url, *, attempts=4, base=0.5, cap=30.0, sleep=time.sleep, rng=random):
    for attempt in range(attempts):
        try:
            return client.get(url).raise_for_status()
        except httpx.HTTPStatusError as error:
            if error.response.status_code not in RETRY_STATUSES or attempt == attempts - 1:
                raise
        except httpx.TransportError:
            if attempt == attempts - 1:
                raise
        sleep(rng.uniform(0, min(cap, base * 2 ** attempt)))


answers = iter([503, "timeout", 200])


def flaky_shop(request):
    answer = next(answers)
    print("server answers:", answer)
    if answer == "timeout":
        raise httpx.ReadTimeout("slow", request=request)
    return httpx.Response(answer, json={"orders": []})


waits = []
client = httpx.Client(transport=httpx.MockTransport(flaky_shop), timeout=10)
response = get_with_retries(client, "https://api.shop.example/v2/orders", sleep=waits.append, rng=random.Random(1))
response.status_code, [round(wait, 3) for wait in waits]
```

Module 8's `retry` decorator did the same job for any function. For HTTP, the decision depends on
the response as well as on exceptions, so a loop around the request, kept in one place in your API
client (lesson 7), is clearer.

```quiz
question: "An attempt fails with a 422 Unprocessable Entity. What should the retry loop do?"
options:
  - Wait with backoff and try again
  - Raise straight away, without waiting
  - Wait for Retry-After, then try again
answer: 1
explain: "422 means the data in the request is invalid. Sending the same data again gets the same 422, so waiting only delays the error."
```

## Rate limits and Retry-After

Most APIs limit how many requests you can make: 100 a minute, 5,000 an hour. Go over and you get
`429 Too Many Requests`, usually with a `Retry-After` header that says how long to wait, either as
a number of seconds or as an HTTP date:

```text
HTTP/1.1 429 Too Many Requests
Retry-After: 20

HTTP/1.1 503 Service Unavailable
Retry-After: Wed, 30 Sep 2026 12:00:00 GMT
```

When the server tells you how long to wait, wait that long, not whatever your backoff says. If it
asks for longer than your job can sensibly sit idle (an hour, say), don't sleep inside a request:
give up now and try again in the next run. Many APIs also send headers such as
`X-RateLimit-Remaining` and `X-RateLimit-Reset` on every response, so you can slow down before you
hit the limit at all. Their names vary between providers, so read the docs.

Both forms of `Retry-After` convert to seconds with the standard library:

```python
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

now = datetime(2026, 9, 30, 11, 59, 30, tzinfo=timezone.utc)
for value in ["20", "Wed, 30 Sep 2026 12:00:00 GMT"]:
    if value.isdigit():
        print(repr(value), "->", float(value), "seconds")
    else:
        print(repr(value), "->", (parsedate_to_datetime(value) - now).total_seconds(), "seconds")
```

> [!WARNING]
> Ignoring `Retry-After` is the fastest way to get an API key suspended. To the provider, a client
> that keeps retrying during a rate limit looks exactly like an attack.

## Idempotency keys

Here's the hard case. You `POST` a payment and the request times out. Did the charge go through?
You can't tell: maybe the request never arrived, maybe the response was lost on the way back.
Retry, and you might charge the customer twice. Don't, and you might not charge them at all.

APIs that take payments, send messages or create orders solve this with an **idempotency key**: a
unique ID you generate for the operation (a UUID) and send in an `Idempotency-Key` header. The
server remembers the result for each key, and a retry with the same key gets the original result
back instead of repeating the work:

```python
import uuid

import httpx

charges = {}
lose_next_response = True


def payments(request):
    global lose_next_response
    key = request.headers["idempotency-key"]
    if key not in charges:
        charges[key] = {"id": f"ch_{len(charges) + 1}", "amount": 4200}
    if lose_next_response:
        lose_next_response = False
        raise httpx.ReadTimeout("the response was lost on the way back", request=request)
    return httpx.Response(200, json=charges[key])


client = httpx.Client(transport=httpx.MockTransport(payments), base_url="https://api.payments.example", timeout=10)
key = str(uuid.uuid4())
for attempt in range(1, 3):
    try:
        charge = client.post("/v1/charges", json={"amount": 4200, "currency": "gbp"}, headers={"Idempotency-Key": key})
        print("attempt", attempt, "->", charge.json())
        break
    except httpx.ReadTimeout as error:
        print("attempt", attempt, "timed out:", error)
len(charges)
```

The first attempt was processed but its response was lost. The retry, with the same key, got the
same charge back, and the customer was charged once. The rules: generate **one key per operation**,
reuse it for every retry of that operation, and use a new key for the next operation.

> [!TIP]
> Only retry a `POST` automatically when the API supports idempotency keys (check its docs). For
> an API that doesn't, a timed-out `POST` needs a human, or a `GET` to find out whether it worked.

## Where this leaves you

Retry transport errors, `429` and `5xx`; never retry other `4xx`. Wait with exponential backoff and
full jitter, taking `sleep` and the random source as parameters so tests are instant and
repeatable. When the server sends `Retry-After`, it wins, and a wait that's too long means stop
and try later. And a `POST` is only safe to retry with an idempotency key that stays the same
across its retries. The drills build each piece, then fix two retry loops that got it wrong.
