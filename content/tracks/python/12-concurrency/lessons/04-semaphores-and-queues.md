---
slug: semaphores-and-queues
title: Semaphores, rate limits and queues
summary: Cap how much runs at once, space out requests to respect a rate limit, and feed work to a fixed pool of workers through a queue.
minutes: 45
exercises:
  - async-predict-semaphore-order
  - async-fix-unbounded-gather
  - async-throttle
  - async-worker-pool
  - async-thumbnail-pipeline
---

`gather` makes concurrency easy, and that's the danger. Hand it 5,000 product URLs and it opens
5,000 connections at the same moment. The shop's server answers with `429 Too Many Requests`, or
bans your IP address, and your own machine runs out of sockets. Real concurrent code needs limits:
how many requests at once, how many per second, and how much work waiting in line.

## Unbounded concurrency is a bug

Here's a fake API that, like most real ones, refuses more than a few requests in flight at once.
Watch what an unlimited `gather` does to it:

```python
import asyncio

class CatalogueAPI:
    """Allows 3 requests in flight at once; answers 429 beyond that."""

    def __init__(self):
        self.in_flight = 0

    async def product(self, sku):
        self.in_flight += 1
        try:
            if self.in_flight > 3:
                raise RuntimeError(f"{sku}: 429 Too Many Requests")
            await asyncio.sleep(0.01)
            return {"sku": sku, "stock": 12}
        finally:
            self.in_flight -= 1

async def main():
    api = CatalogueAPI()
    skus = [f"SKU-{n}" for n in range(10)]
    results = await asyncio.gather(*(api.product(sku) for sku in skus), return_exceptions=True)
    failed = [r for r in results if isinstance(r, Exception)]
    print(f"{len(skus) - len(failed)} ok, {len(failed)} refused")
    print(failed[0])

asyncio.run(main())
```

Seven of the ten requests were refused, because all ten were sent at once. The fix isn't to stop
being concurrent. It's to be concurrent up to a limit.

## Semaphores

An `asyncio.Semaphore(n)` is a counter of free slots. `async with semaphore:` takes a slot, waiting
at the `await` if none is free, and gives it back when the block ends, even on an exception. At
most `n` coroutines are ever inside the block:

```python
import asyncio

active = 0
peak = 0

async def fetch_product(sku, limit):
    global active, peak
    async with limit:
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.01)
        active -= 1
        return sku

async def main():
    limit = asyncio.Semaphore(3)
    skus = [f"SKU-{n}" for n in range(10)]
    results = await asyncio.gather(*(fetch_product(sku, limit) for sku in skus))
    print(len(results), "fetched, at most", peak, "at once")

asyncio.run(main())
```

All ten coroutines are started straight away, but seven of them wait at `async with limit` until a
slot is free. You still get concurrency, just never more than three requests' worth.

> [!WARNING]
> The limit only works if every request shares **one** semaphore. Creating
> `asyncio.Semaphore(3)` inside the function that makes each request gives every request its own
> three slots, which limits nothing.

> [!JS]
> Coming from JavaScript: this is what libraries like `p-limit` do for `Promise.all`. In Python
> it's built in.

## Rate limits

A semaphore limits how many requests are **in flight**. Many APIs limit something else: how many
requests **start** per second. "10 requests per second" is broken by 10 quick requests in the
first 100 ms, even if only one is ever in flight.

The simplest limiter spaces out the starts: each caller books the next free start time, then
sleeps until it arrives.

```python
import asyncio

class Throttle:
    """At most `per_second` starts per second, evenly spaced."""

    def __init__(self, per_second):
        self.interval = 1 / per_second
        self.next_start = 0.0

    async def wait(self):
        now = asyncio.get_running_loop().time()
        start = max(now, self.next_start)
        self.next_start = start + self.interval      # book the slot before waiting
        await asyncio.sleep(start - now)

async def call_api(throttle, started):
    await throttle.wait()
    started.append(asyncio.get_running_loop().time())

async def main():
    throttle = Throttle(per_second=10)
    started = []
    await asyncio.gather(*(call_api(throttle, started) for _ in range(5)))
    print("started at", [round(t - started[0], 1) for t in started], "seconds")

asyncio.run(main())
```

`loop.time()` is the event loop's own monotonic clock, the one its timers use. Notice there's no
lock around `next_start`, even though five coroutines share it. None is needed: `wait` has no
`await` between reading `next_start` and updating it, so no other coroutine can run in between.
That's a real advantage of asyncio over threads, and lesson 7 comes back to it.

```quiz
question: An API allows 5 requests in flight and 20 requests per second. Each request takes about 1 s. Which limit do you hit first?
options:
  - "The 20 per second limit"
  - "The 5 in flight limit"
  - "Neither"
answer: 1
explain: "With 5 in flight and each taking a second, you can only start about 5 per second, well under 20. A semaphore of 5 is the limit that matters. With 50 ms requests it would be the other way round."
```

## Queues and workers

A semaphore still creates every coroutine up front. For a very long list, or work that keeps
arriving, it's better to have a **fixed pool of workers** that take jobs from a line. That line is
an `asyncio.Queue`:

- `await queue.put(item)` adds an item, waiting if the queue is full (`Queue(maxsize=10)`).
- `await queue.get()` takes the next item, waiting while the queue is empty.
- `queue.task_done()` tells the queue one item is finished, and `await queue.join()` waits until
  every item that was put has been marked done.

```python
import asyncio

async def worker(name, queue, results):
    while True:
        invoice = await queue.get()
        await asyncio.sleep(0.05 * invoice["pages"])       # render the PDF
        results.append(f"{invoice['id']} by {name}")
        queue.task_done()

async def main():
    queue = asyncio.Queue()
    for n, pages in enumerate([3, 1, 1, 2, 2], start=1):
        queue.put_nowait({"id": f"INV-{n}", "pages": pages})

    results = []
    workers = [asyncio.create_task(worker(f"w{n}", queue, results)) for n in (1, 2)]
    await queue.join()           # every invoice rendered
    for task in workers:
        task.cancel()            # the workers loop forever: stop them
    return results

asyncio.run(main())
```

Two workers, five invoices, never more than two renders at once. The short invoices didn't wait for
the long first one: `w2` got through three of them while `w1` was still rendering `INV-1`.

This is the **producer–consumer** pattern. Producers put work in, consumers take it out, and the
queue decouples them: neither needs to know how fast the other is.

## Backpressure and stopping cleanly

A queue with a `maxsize` gives you **backpressure**: when consumers fall behind, `put` waits, so a
fast producer slows down to match instead of piling up millions of items in memory.

Workers that loop forever need to be told to stop. Cancelling them after `join()` works, as above.
Another common way is a **sentinel**: after the real work, the producer puts one special value per
worker, and a worker that gets it returns. Python 3.13 added a third, `queue.shutdown()`, after
which `get()` on an empty queue raises `asyncio.QueueShutDown`.

```python
import asyncio

DONE = object()      # a sentinel: no real job is ever this exact object

async def producer(queue, orders):
    for order in orders:
        await queue.put(order)
        print("queued", order)
    await queue.put(DONE)

async def consumer(queue):
    while (order := await queue.get()) is not DONE:
        await asyncio.sleep(0.01)
        print("  packed", order)

async def main():
    queue = asyncio.Queue(maxsize=2)
    async with asyncio.TaskGroup() as group:
        group.create_task(producer(queue, ["A-1", "A-2", "A-3", "A-4"]))
        group.create_task(consumer(queue))

asyncio.run(main())
```

The producer ran ahead until the queue was full, then had to wait for the packer to take an order
out before it could queue the next. Change `maxsize` to 0 (unbounded) and run it again: all four
are queued before anything is packed.

## Where this leaves you

Never fan out without a limit. A shared `Semaphore` caps how many requests are in flight; a
throttle spaces out how many start per second. A `Queue` with a fixed pool of workers processes a
long or endless stream of jobs, `maxsize` gives you backpressure, and `join()` with cancellation or
a sentinel stops the workers cleanly. The drills predict a semaphore, fix an unbounded `gather`,
build a sliding-window throttle, write a worker pool, and finish with a two-stage pipeline.
