---
slug: threads-processes-and-bridging
title: Thread pools, process pools and bridging sync and async
summary: concurrent.futures runs blocking and CPU-bound work on threads and processes, pure functions make work easy to split, and a few calls join sync and async code.
minutes: 45
exercises:
  - concurrency-chunk-work
  - concurrency-predict-pickling
  - concurrency-merge-counts
  - async-sync-wrapper
  - concurrency-parallel-map
lab:
  title: Pools on a real machine
  kind: output
  instructions: >-
    Run pools.py exactly as the lesson gives it and paste the output. It should have all five
    timing lines, three for downloads and two for primes.
  command: uv run pools.py
  patterns:
    - '^downloads, one by one\s+[\d.]+ s'
    - '^downloads, thread pool\s+[\d.]+ s'
    - '^downloads, asyncio\.to_thread\s+[\d.]+ s'
    - '^primes, one by one\s+[\d.]+ s'
    - '^primes, process pool\s+[\d.]+ s'
---

Not everything can be awaited. The shipping company's SDK only has blocking calls, the image
library resizes photos in pure Python, and half your codebase is ordinary `def` functions that
will never be rewritten. This lesson covers the other two tools from lesson 1, thread pools and
process pools, and the calls that let sync and async code use each other.

> [!NOTE]
> Threads and processes don't exist in the browser, so their examples here are shown with the
> output they print on a real machine, and the section "Do it on your machine" has a script to run
> yourself. Everything a pool needs from *your* code, though, runs here: which values can be sent
> to another process, and how to split work into pieces. That's what the drills practise.

## concurrent.futures: one interface, two pools

`concurrent.futures` gives threads and processes the same interface. An **executor** owns a pool of
workers. `executor.map(fn, items)` runs `fn` on every item across the pool and returns the results
in order; `executor.submit(fn, *args)` runs one call and returns a **future**, whose `.result()`
waits for it:

```python norun
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def track_parcel(parcel_id):
    time.sleep(1)                      # a blocking call to the courier's SDK
    return f"{parcel_id}: in transit"

with ThreadPoolExecutor(max_workers=8) as pool:
    start = time.perf_counter()
    for status in pool.map(track_parcel, ["P-101", "P-102", "P-103", "P-104"]):
        print(status)
    print(f"{time.perf_counter() - start:.1f} s")

    futures = {pool.submit(track_parcel, pid): pid for pid in ["P-201", "P-202"]}
    for future in as_completed(futures):
        print("finished", futures[future], "->", future.result())
```

```text
P-101: in transit
P-102: in transit
P-103: in transit
P-104: in transit
1.0 s
finished P-202 -> P-202: in transit
finished P-201 -> P-201: in transit
```

Four one-second calls took one second: each thread waited on its own call, and a waiting thread
releases the GIL. If the function raises, `future.result()` (or iterating `map`) raises the same
exception in your thread. The `with` block waits for every submitted call before it exits.

> [!JS]
> Coming from JavaScript: a `concurrent.futures.Future` is a lot like a Promise, but you block on
> it with `.result()` instead of awaiting it. `asyncio` has its own `Future`, which is awaitable;
> they're different classes.

## Threads share memory, so they race

Threads run in one process, so they see the same objects. That's convenient, and it's dangerous:
the interpreter can switch threads between any two bytecode instructions, so a read-modify-write
of shared data can interleave with another thread's.

```python norun
import threading
from concurrent.futures import ThreadPoolExecutor

stock = {"MUG-STN": 100}

def sell_one():
    left = stock["MUG-STN"]            # read
    left = left - 1                    # modify
    stock["MUG-STN"] = left            # write: another thread may have written in between

with ThreadPoolExecutor(max_workers=8) as pool:
    for _ in range(100):
        pool.submit(sell_one)
print(stock)
```

```text
{'MUG-STN': 3}
```

Sometimes it prints `0`, sometimes not, which is the worst kind of bug. A `threading.Lock` makes the
three steps happen as one: `with lock:` around them, and only one thread at a time gets inside.
Free-threaded Python makes these races *more* likely, not less. Lesson 7 shows the asyncio version
of the same bug, which can only happen at an `await`.

## Process pools

A `ProcessPoolExecutor` starts separate Python processes, each with its own interpreter and its
own GIL, so CPU-bound work really runs in parallel. The price is that the processes share
nothing. Every function, argument and result is **pickled** (serialised to bytes, module 6's JSON
idea for any Python object), sent to the worker, and unpickled there.

```python norun
from concurrent.futures import ProcessPoolExecutor

def make_thumbnail(path):
    ...                                # CPU-heavy resizing in pure Python
    return path.replace(".jpg", "-thumb.jpg")

if __name__ == "__main__":             # required: workers import this module
    with ProcessPoolExecutor() as pool:            # one worker per CPU core by default
        thumbs = list(pool.map(make_thumbnail, photo_paths, chunksize=50))
```

Three rules follow from that:

- **The function must be importable by name.** A worker receives "call `make_thumbnail` from
  module `thumbnails`", not the function itself. Lambdas, functions defined inside other functions,
  and bound methods of objects that can't be pickled can't be sent.
- **Guard the entry point.** On Windows and macOS, and by default on Linux since Python 3.14, a new
  worker starts a fresh interpreter and imports your module. Without `if __name__ == "__main__":`,
  every worker would start a pool of its own.
- **Send big pieces.** Pickling and sending costs time, so a million tiny jobs can be slower than
  one loop. Give each worker a large chunk (`chunksize=` for `map`, or chunks you build yourself).

You can check what's picklable right here:

```python
import pickle

def vat(amount):
    return round(amount * 0.2, 2)

def check(label, obj):
    try:
        pickle.dumps(obj)
        print(f"{label:<22} can be sent")
    except Exception as error:
        print(f"{label:<22} can't: {type(error).__name__}")

check("a top-level function", vat)
check("a lambda", lambda amount: amount * 0.2)
check("a dict of prices", {"MUG-STN": 5.60})
check("a generator", (n for n in range(3)))
```

> [!NOTE]
> Python 3.14 added a third pool, `InterpreterPoolExecutor`: several interpreters inside one
> process, each with its own GIL. It starts faster than a process pool, but it has the same rule
> that data is copied between workers, not shared.

## Splitting work with pure functions

The best code to hand to a pool is a **pure function**: its result depends only on its arguments,
and it changes nothing outside itself. Then it doesn't matter which worker runs it, in what order,
or whether the "pool" is plain `map`. The usual shape is three small functions: **split** the
input into chunks, **work** on one chunk, and **merge** the partial results.

```python
from collections import Counter

def chunk(items, parts):
    size = -(-len(items) // parts)                     # ceiling division
    return [items[i:i + size] for i in range(0, len(items), size)]

def count_status(lines):
    return Counter(line.split()[-1] for line in lines)

def merge(counters):
    total = Counter()
    for counter in counters:
        total += counter
    return total

log = ["GET /cart 200", "GET /pay 500", "POST /pay 201", "GET /cart 200", "GET /img 404"] * 4
partials = map(count_status, chunk(log, 3))            # locally: pool.map(count_status, ...)
merge(partials)
```

That ran with the built-in `map`. On your machine, swapping in `pool.map` from a
`ProcessPoolExecutor` spreads the chunks across cores, and nothing else changes. Testing the pure
pieces with plain `map` first is how you keep parallel code debuggable.

## Blocking code inside asyncio

An async program sometimes has to call something that blocks: a sync SDK, a slow file operation,
a CPU-heavy function. Called directly, it freezes the event loop (lesson 7). Hand it to a thread
instead, and await the result:

```python norun
import asyncio
from concurrent.futures import ProcessPoolExecutor

async def handle_upload(photo):
    receipt = await asyncio.to_thread(legacy_sdk.upload, photo)   # blocking I/O: a thread

    loop = asyncio.get_running_loop()
    with ProcessPoolExecutor() as pool:                            # CPU-bound: a process
        thumb = await loop.run_in_executor(pool, make_thumbnail, photo)
    return receipt, thumb
```

`asyncio.to_thread(fn, *args)` runs a blocking function in the loop's default thread pool, and the
coroutine waits at the `await` without blocking anything else. `loop.run_in_executor(executor, fn,
*args)` does the same with any executor you choose, including a process pool for CPU work.

## Async code from sync code

The other direction is simpler. Ordinary code calls `asyncio.run()` to run a coroutine to the end
and get its result, so a sync function can wrap an async one:

```python
import asyncio

async def fetch_rate(currency):
    await asyncio.sleep(0.01)
    return {"GBP": 0.86, "USD": 1.17}[currency]

async def fetch_rates(currencies):
    rates = await asyncio.gather(*(fetch_rate(c) for c in currencies))
    return dict(zip(currencies, rates))

def get_rates(currencies):
    """A plain function for sync callers, such as a CLI or a Django view."""
    return asyncio.run(fetch_rates(currencies))

get_rates(["GBP", "USD"])
```

Two limits apply on a real machine. `asyncio.run` refuses to start inside a thread that already
has a running event loop, so async code must `await` the coroutine instead of wrapping it again.
And a thread that isn't running the loop hands coroutines to it with
`asyncio.run_coroutine_threadsafe(coro, loop)`, which returns a `concurrent.futures.Future`:

```python norun
async def main():
    return get_rates(["GBP"])          # asyncio.run() inside a running loop

asyncio.run(main())
```

```text
RuntimeError: asyncio.run() cannot be called from a running event loop
```

> [!WARNING]
> The browser's Python runs everything on one event loop that's always running, and it lets
> `asyncio.run()` nest. Real CPython doesn't. Don't rely on nesting: in async code, `await`.

```quiz
question: An async web handler must call a blocking PDF library that takes 2 s per call. What keeps the server responsive?
options:
  - "Call it directly: it's inside async def, so it's async"
  - "await asyncio.to_thread(render_pdf, invoice)"
  - "asyncio.run(render_pdf(invoice))"
answer: 1
explain: "Calling it directly blocks the event loop for 2 s, freezing every other request. asyncio.run needs a coroutine and can't run inside a running loop anyway. to_thread moves the blocking call to a thread while the loop keeps serving."
```

## Do it on your machine

Save this as `pools.py` and run it with `uv run pools.py`:

```python norun
import asyncio
import time
import urllib.request
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

URLS = ["https://www.python.org", "https://pypi.org", "https://docs.python.org/3/"] * 3

def download(url):
    with urllib.request.urlopen(url, timeout=10) as response:
        return len(response.read())

def count_primes(limit):
    return sum(all(n % d for d in range(2, int(n**0.5) + 1)) for n in range(2, limit))

def timed(label, fn):
    start = time.perf_counter()
    fn()
    print(f"{label:<28} {time.perf_counter() - start:.2f} s")

async def download_all():
    return await asyncio.gather(*(asyncio.to_thread(download, url) for url in URLS))

if __name__ == "__main__":
    timed("downloads, one by one", lambda: [download(url) for url in URLS])
    with ThreadPoolExecutor(max_workers=9) as pool:
        timed("downloads, thread pool", lambda: list(pool.map(download, URLS)))
    timed("downloads, asyncio.to_thread", lambda: asyncio.run(download_all()))
    timed("primes, one by one", lambda: [count_primes(150_000) for _ in range(4)])
    with ProcessPoolExecutor() as pool:
        timed("primes, process pool", lambda: list(pool.map(count_primes, [150_000] * 4)))
```

1. Compare the three download lines. The pool and `to_thread` should be several times faster than
   one by one.
2. Compare the two primes lines, then run it again with `uv run --python 3.14t pools.py` and add a
   `ThreadPoolExecutor` line for the primes. On the free-threaded build, threads catch up with
   processes.
3. Move `count_primes` inside the `if __name__ == "__main__":` block and run it. Read the
   error: the workers can't find the function by name.
4. Delete the `if __name__ == "__main__":` line (and dedent). Each worker now runs the whole
   script when it imports it, and Python stops with a `RuntimeError` about starting a new process
   before the current one has finished bootstrapping. Put it back.
5. **Check it:** paste the output of `uv run pools.py`, as first written, into the lab box below.

## Where this leaves you

`ThreadPoolExecutor` suits blocking I/O, `ProcessPoolExecutor` suits CPU-bound work, and both
share one interface of `map`, `submit` and futures. Threads share memory and need locks; processes
share nothing, so everything they send must pickle, and the functions must be importable by name.
Split work into pure chunk, work and merge functions and it runs the same under `map` or a pool.
`asyncio.to_thread` and `run_in_executor` call blocking code from async code, and `asyncio.run`
calls async code from sync code. The drills split work, predict what pickles, merge partial
results, wrap an async client for sync callers and build a pool-ready `parallel_map`.
