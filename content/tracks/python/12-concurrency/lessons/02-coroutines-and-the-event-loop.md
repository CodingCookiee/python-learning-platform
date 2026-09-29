---
slug: coroutines-and-the-event-loop
title: Coroutines, the event loop and tasks
summary: What async def really creates, what await does, how the event loop drives it all, and how tasks make coroutines run side by side.
minutes: 40
exercises:
  - async-first-coroutine
  - async-predict-task-order
  - async-fix-forgotten-await
  - async-refactor-sequential-to-tasks
  - async-tiny-event-loop
---

The last lesson ran three downloads on one thread with a loop that took turns between generators.
asyncio is that idea made into a library: `async def` gives you functions that can pause, `await`
marks where they pause, and the **event loop** takes turns between them. This lesson builds it up
one piece at a time, because once you see the mechanism, the rules of asyncio stop being rules to
memorise.

## async def makes a coroutine function

Put `async` in front of `def` and you get a **coroutine function**. Calling it doesn't run its
body. It returns a **coroutine object**: a paused computation, waiting to be started.

```python
import asyncio

async def fetch_price(sku):
    print(f"fetching {sku}")
    await asyncio.sleep(0.1)          # stands in for a network call
    return 12.50

coro = fetch_price("ETH-1KG")
print(type(coro).__name__, asyncio.iscoroutine(coro))
coro.close()                          # we never ran it; close it so Python doesn't warn
```

Nothing printed `fetching ETH-1KG`. The body hasn't started, and it never will unless something
awaits or schedules the coroutine. Forget to, and Python only notices when the object is thrown
away: `RuntimeWarning: coroutine 'fetch_price' was never awaited`.

> [!JS]
> Coming from JavaScript: calling an `async function` starts it straight away and hands you a
> Promise that's already running. A Python coroutine object is inert: nothing happens until it's
> awaited or turned into a task.

## await, and asyncio.run

`await` runs a coroutine and gives you its return value. It can only appear inside an `async def`,
so something has to start the first coroutine from ordinary code. That's `asyncio.run()`: it
creates an event loop, runs one coroutine on it to the end, and returns its result.

```python
import asyncio
import time

async def fetch_price(sku):
    await asyncio.sleep(0.1)
    return {"ETH-1KG": 14.20, "MUG-STN": 5.60}[sku]

async def main():
    start = time.perf_counter()
    coffee = await fetch_price("ETH-1KG")
    mug = await fetch_price("MUG-STN")
    print(f"{coffee + mug:.2f} in {time.perf_counter() - start:.1f} s")

asyncio.run(main())
```

That took 0.2 seconds: `await` waits for the first fetch to finish before the second one starts.
Awaiting a coroutine is still sequential. Concurrency needs one more piece, tasks, which comes in a
moment.

> [!NOTE]
> A script calls `asyncio.run(main())` once, at the bottom. The browser and `python -m asyncio`
> (an async REPL) already have a loop running, so they also accept `await` at the top level. A
> normal `.py` file doesn't: there, `await` outside a function is a syntax error.

## What await does underneath

A coroutine is a generator in disguise. `await` hands control down through the coroutines being
awaited until it reaches an object that really waits, like the one inside `asyncio.sleep`. That
object `yield`s up to whoever is driving the coroutine, and the whole stack of coroutines pauses
right there.

You can drive one by hand with `send()`, exactly as you drove generators in module 8:

```python
class WaitForNetwork:
    """The smallest possible thing to await: it pauses once."""

    def __await__(self):
        yield "waiting for the network"

async def charge_card(amount):
    print("sending the charge")
    await WaitForNetwork()
    print("bank replied")
    return f"charged {amount:.2f}"

coro = charge_card(49.99)
paused_on = coro.send(None)          # runs to the first pause
print("the coroutine paused on:", paused_on)
try:
    coro.send(None)                  # resume it: it runs to the end
except StopIteration as finished:
    print("it returned:", finished.value)
```

That is the **event loop**'s job, over and over: pick a coroutine that's ready, `send()` into it
until it pauses, note what it's waiting for (a timer, a socket), and move on to the next one. When
a timer fires or data arrives, the coroutine waiting for it becomes ready again. When it finishes,
its `StopIteration` carries the return value, just as a generator's does.

> [!TIP]
> This is the one idea to hold on to: **a coroutine only ever pauses at an `await`**. Between two
> awaits, it runs without interruption, and nothing else on the loop runs at all.

```quiz
question: "Inside `async def report()`, what does `await asyncio.sleep(1)` do to the other coroutines on the loop?"
options:
  - "Nothing runs until the sleep ends"
  - "They get to run: report pauses and the loop moves on to whatever is ready"
  - "They run in parallel on other threads"
answer: 1
explain: "await is the point where report hands control back to the event loop. The loop runs other ready coroutines on the same thread, and resumes report when its timer fires."
```

## Tasks run coroutines concurrently

To have two things in progress at once, wrap each coroutine in a **task** with
`asyncio.create_task()`. A task is a coroutine that the event loop has scheduled: the loop will
start it and drive it without anyone awaiting it first.

```python
import asyncio
import time

async def fetch_price(sku):
    print(f"  request {sku}")
    await asyncio.sleep(0.1)
    print(f"  reply   {sku}")
    return {"ETH-1KG": 14.20, "MUG-STN": 5.60}[sku]

async def main():
    start = time.perf_counter()
    coffee = asyncio.create_task(fetch_price("ETH-1KG"))
    mug = asyncio.create_task(fetch_price("MUG-STN"))
    print("both scheduled")
    total = await coffee + await mug
    print(f"{total:.2f} in {time.perf_counter() - start:.1f} s")

asyncio.run(main())
```

0.1 seconds this time: both requests were waiting at the same moment. Look at the order too.
`both scheduled` comes *before* either request, because `create_task` only schedules the task.
`main` keeps running until its first `await`, and only then does the loop get a chance to start
the new tasks.

> [!JS]
> Coming from JavaScript: this is the difference between `await fetchPrice(a); await fetchPrice(b)`
> and `const p = fetchPrice(a); const q = fetchPrice(b); await p; await q`. In Python the second
> form needs `create_task`, because a bare coroutine object doesn't start by itself.

## Awaiting a task

`await task` waits for the task to finish and gives you its result. If the task raised an
exception, awaiting it raises that exception in the awaiting coroutine. A task is a kind of
**future**, an object that will hold a result later, and you can check on it without waiting:

```python
import asyncio

async def refund(order_id):
    await asyncio.sleep(0.01)
    if order_id == "A-1043":
        raise ValueError(f"{order_id}: already refunded")
    return f"{order_id} refunded"

async def main():
    good = asyncio.create_task(refund("A-1042"))
    bad = asyncio.create_task(refund("A-1043"))
    print(good.done())               # False: neither task has run yet
    print(await good)
    try:
        await bad
    except ValueError as error:
        print("failed:", error)
    print(good.done(), bad.done())

asyncio.run(main())
```

Only the coroutine that awaits a task sees its exception. A task nobody awaits keeps its
exception to itself, which is one of the bugs in lesson 7.

## Where this leaves you

`async def` makes a coroutine function; calling it returns an inert coroutine object. `await` runs
one and waits for its result, and `asyncio.run` starts the first. Underneath, coroutines are
generators: each `await` that really waits yields to the event loop, which resumes the coroutine
with `send` when it's ready. Tasks let the loop run several coroutines at once, and they start only
when the coroutine that created them next awaits. The drills write a coroutine, predict task order,
fix forgotten awaits, make sequential code concurrent, and finish by building a small event loop.
