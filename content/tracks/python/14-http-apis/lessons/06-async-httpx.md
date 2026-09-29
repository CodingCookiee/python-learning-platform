---
slug: async-httpx
title: Async httpx and concurrency limits
summary: AsyncClient, many requests at once with gather and TaskGroup, and a semaphore so that "at once" never means "all at once".
minutes: 45
exercises:
  - http-async-exchange-rate
  - http-predict-gather-order
  - http-refactor-sequential-awaits
  - http-semaphore-cap
  - http-async-batch-with-retries
---

Fetching 500 product prices one after another, at 200 milliseconds each, takes 100 seconds, and
your program spends 99 of them waiting for the network. Module 12 showed that asyncio is built for
exactly this: while one request waits, others can be on their way. httpx has an async client with
the same API as the one you know, so everything from the first five lessons carries over. You add
`await`, and then you add a limit, because an API that receives 500 requests in the same instant
will answer most of them with `429`.

## AsyncClient

`httpx.AsyncClient` takes the same arguments as `httpx.Client`, and its methods are coroutines:
`await client.get(...)`. Use it with `async with`. `MockTransport` accepts an `async def` handler,
which lets a fake server take time to answer:

```python
import asyncio
import time

import httpx

RATES = {"EUR": "1.1702", "USD": "1.3391", "JPY": "198.64", "CHF": "1.1215", "SEK": "14.207"}


async def fx_api(request):
    await asyncio.sleep(0.2)                         # pretend the network takes 200 ms
    quote = request.url.params["quote"]
    return httpx.Response(200, json={"base": "GBP", "quote": quote, "rate": RATES[quote]})


async def get_rate(client, quote):
    response = await client.get("/v1/rates", params={"base": "GBP", "quote": quote})
    return response.raise_for_status().json()["rate"]


async def main():
    async with httpx.AsyncClient(transport=httpx.MockTransport(fx_api), base_url="https://api.fx.example", timeout=10) as client:
        started = time.perf_counter()
        rates = {quote: await get_rate(client, quote) for quote in RATES}
        print(f"one at a time: {time.perf_counter() - started:.1f}s", rates)


asyncio.run(main())
```

That's still one at a time: each `await` finishes before the next request starts, so five requests
take a second.

> [!JS]
> Coming from JavaScript: `await client.get(...)` is `await fetch(...)`, and `asyncio.gather` in the
> next section is `Promise.all`. The difference is that a Python coroutine doesn't start running
> until something awaits it or makes it a task.

## Many requests at once

`asyncio.gather` runs several coroutines concurrently and returns their results **in the order you
passed them**, whatever order they finish in:

```python
import asyncio
import time

import httpx

RATES = {"EUR": "1.1702", "USD": "1.3391", "JPY": "198.64", "CHF": "1.1215", "SEK": "14.207"}


async def fx_api(request):
    await asyncio.sleep(0.2)
    quote = request.url.params["quote"]
    return httpx.Response(200, json={"base": "GBP", "quote": quote, "rate": RATES[quote]})


async def get_rate(client, quote):
    response = await client.get("/v1/rates", params={"base": "GBP", "quote": quote})
    return response.raise_for_status().json()["rate"]


async def main():
    async with httpx.AsyncClient(transport=httpx.MockTransport(fx_api), base_url="https://api.fx.example", timeout=10) as client:
        started = time.perf_counter()
        rates = await asyncio.gather(*(get_rate(client, quote) for quote in RATES))
        print(f"all at once: {time.perf_counter() - started:.1f}s", dict(zip(RATES, rates)))


asyncio.run(main())
```

Five requests in the time of one. `asyncio.TaskGroup` does the same job with stricter error
handling (below): create a task per request inside `async with asyncio.TaskGroup() as group:`, and
read each task's `.result()` after the block.

## Too much at once

`gather` over 5,000 SKUs starts 5,000 requests in the same instant. httpx itself holds back some of
them (a client opens at most 100 connections by default, and the rest wait for one, which can end in
a `PoolTimeout`), but the API sees a flood, and its rate limiter answers with `429`. Here's a fake
warehouse API that allows three requests in flight, and a batch that ignores that:

```python
import asyncio

import httpx

in_flight = 0


async def warehouse(request):
    global in_flight
    if in_flight >= 3:
        return httpx.Response(429, headers={"Retry-After": "1"}, json={"error": "too many requests"})
    in_flight += 1
    try:
        await asyncio.sleep(0.05)
        return httpx.Response(200, json={"available": 12})
    finally:
        in_flight -= 1


async def main():
    skus = [f"SKU-{n:02}" for n in range(1, 11)]
    async with httpx.AsyncClient(transport=httpx.MockTransport(warehouse), base_url="https://api.warehouse.example", timeout=10) as client:
        responses = await asyncio.gather(*(client.get(f"/v1/stock/{sku}") for sku in skus))
    print([response.status_code for response in responses])


asyncio.run(main())
```

Three got through; seven were refused.

## Capping concurrency with a semaphore

An `asyncio.Semaphore(n)` is a counter of free slots. `async with semaphore:` waits for a slot,
holds it for the block, and gives it back at the end, so at most `n` blocks run at once. Put the
request inside it, and the batch keeps exactly `n` requests in flight: as one finishes, the next
starts.

```python
import asyncio

import httpx

in_flight = 0


async def warehouse(request):
    global in_flight
    if in_flight >= 3:
        return httpx.Response(429, headers={"Retry-After": "1"}, json={"error": "too many requests"})
    in_flight += 1
    try:
        await asyncio.sleep(0.05)
        return httpx.Response(200, json={"available": 12})
    finally:
        in_flight -= 1


async def stock_level(client, semaphore, sku):
    async with semaphore:
        response = await client.get(f"/v1/stock/{sku}")
    return response.status_code


async def main():
    skus = [f"SKU-{n:02}" for n in range(1, 11)]
    semaphore = asyncio.Semaphore(3)
    async with httpx.AsyncClient(transport=httpx.MockTransport(warehouse), base_url="https://api.warehouse.example", timeout=10) as client:
        print(await asyncio.gather(*(stock_level(client, semaphore, sku) for sku in skus)))


asyncio.run(main())
```

All ten succeed, and the whole batch still takes only about four round trips. Create the semaphore
inside the function that runs the batch, so each batch gets its own limit, and hold it only around
the request itself. Work that doesn't need the API, such as waiting before a retry, happens
outside it, so it doesn't sit on a slot.

```quiz
question: "A semaphore of 5 guards the request in each of 20 tasks, and every request takes 1 second. Roughly how long does the batch take?"
options:
  - "1 second"
  - "4 seconds"
  - "20 seconds"
answer: 1
explain: "Five requests run at a time, so 20 requests take four rounds of one second each. Without the semaphore it would be one second, and a lot of 429s; without concurrency it would be twenty."
```

## Errors in a batch

When one request in a batch fails, you have three choices, and they behave differently:

| You write | One request raises | The others |
|-----------|--------------------|------------|
| `await asyncio.gather(...)` | the first exception is raised at the `await` | keep running, results lost |
| `await asyncio.gather(..., return_exceptions=True)` | exceptions come back in the results list | all finish |
| `async with asyncio.TaskGroup()` | an `ExceptionGroup` is raised after the block | are cancelled |

For a sync job, where one bad SKU shouldn't sink the other 4,999, `return_exceptions=True` and a
look at each result is usually right:

```python
import asyncio

import httpx


async def warehouse(request):
    sku = request.url.path.rsplit("/", 1)[-1]
    if sku == "GRD-HND":
        return httpx.Response(404, json={"error": "unknown SKU"})
    return httpx.Response(200, json={"available": 7})


async def stock_level(client, sku):
    response = await client.get(f"/v1/stock/{sku}")
    return response.raise_for_status().json()["available"]


async def main():
    skus = ["ETH-1KG", "GRD-HND", "MUG-STN"]
    async with httpx.AsyncClient(transport=httpx.MockTransport(warehouse), base_url="https://api.warehouse.example", timeout=10) as client:
        results = await asyncio.gather(*(stock_level(client, sku) for sku in skus), return_exceptions=True)
    for sku, result in zip(skus, results):
        if isinstance(result, httpx.HTTPStatusError):
            print(sku, "failed:", result.response.status_code)
        elif isinstance(result, BaseException):
            raise result
        else:
            print(sku, result)


asyncio.run(main())
```

Anything that isn't the error you expected is re-raised, so a bug still surfaces as a bug.

## Don't block the loop, and set a deadline

Inside `async def`, never call a blocking function: a sync `httpx.Client`, `time.sleep`, or
anything else that waits without `await`. It works, but the whole event loop stops while it
waits, and your concurrent batch quietly becomes one request at a time. Retry code in async
functions waits with `await asyncio.sleep(...)`, and takes it as a parameter so tests can replace
it.

Async code also gets the hard deadline lesson 2 promised. `asyncio.timeout()` limits the whole
block, however slowly the server trickles its answer:

```python
import asyncio

import httpx


async def slow_report(request):
    await asyncio.sleep(1)          # well within a 10-second read timeout
    return httpx.Response(200, json={"rows": []})


async def main():
    async with httpx.AsyncClient(transport=httpx.MockTransport(slow_report), timeout=10) as client:
        try:
            async with asyncio.timeout(0.3):
                await client.get("https://reports.crm.example/v1/exports/weekly")
        except TimeoutError:
            print("gave up after 0.3 seconds in total")


asyncio.run(main())
```

## Where this leaves you

`httpx.AsyncClient` is `httpx.Client` with `await`. `asyncio.gather` and `TaskGroup` run requests
concurrently and keep results in order; a semaphore held around each request caps how many are in
flight, which is what keeps you under the API's limits. Choose how a batch handles errors
deliberately, never block the loop, and use `asyncio.timeout()` for a hard deadline. The drills
end with a batch that combines the semaphore with lesson 5's retries.
