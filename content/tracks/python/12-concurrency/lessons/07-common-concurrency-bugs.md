---
slug: common-concurrency-bugs
title: Common concurrency bugs
summary: Blocking the loop, forgotten awaits, tasks that vanish, and race conditions, with how to spot each one and the fix that makes it go away.
minutes: 40
exercises:
  - async-fix-blocking-sleep
  - async-predict-forgotten-await
  - async-fix-lost-receipt
  - async-fix-double-booking
  - async-yield-to-the-loop
  - async-background-tasks
---

Concurrent code fails in ways sequential code can't. A single blocking call makes a thousand
tasks wait. A missing `await` makes a check always pass. A task disappears halfway through its work,
and two customers buy the last seat. None of these crash with a helpful traceback: they give wrong
answers, or slow ones. This lesson is a field guide to the four you'll meet most, each with the
wrong way first.

## Blocking the event loop

The event loop runs one coroutine at a time, and it only switches at an `await` (lesson 2). Any
code between awaits that takes a long time **freezes every other task**. The classic cause is a
blocking call inside `async def`:

```python norun
import asyncio
import time

async def heartbeat():
    for _ in range(3):
        print(f"  heartbeat at {time.perf_counter() - START:.1f} s")
        await asyncio.sleep(0.1)

async def fetch_report():
    time.sleep(0.3)                    # blocking: the whole loop stops here
    return "report"

async def main():
    async with asyncio.TaskGroup() as group:
        group.create_task(heartbeat())
        group.create_task(fetch_report())

START = time.perf_counter()
asyncio.run(main())
```

```text
  heartbeat at 0.0 s
  heartbeat at 0.3 s
  heartbeat at 0.4 s
```

The heartbeat should have ticked at 0.1 s and 0.2 s. It couldn't, because `time.sleep` held the
only thread. Everything that blocks does the same: `requests.get`, a synchronous database driver,
reading a large file, or a long computation. Here's the computation version, which you can run:

```python
import asyncio
import hashlib
import time

async def heartbeat(beats):
    while True:
        beats.append(time.perf_counter())
        await asyncio.sleep(0.02)

async def sign_invoices(count, cooperative):
    for n in range(count):
        hashlib.sha256(f"INV-{n}".encode() * 2000).hexdigest()    # CPU work, no await
        if cooperative and n % 100 == 0:
            await asyncio.sleep(0)                                 # let other tasks run

async def main():
    for cooperative in (False, True):
        beats = []
        beat = asyncio.create_task(heartbeat(beats))
        await asyncio.sleep(0)
        start = time.perf_counter()
        await sign_invoices(4000, cooperative)
        beat.cancel()
        label = "yields now and then" if cooperative else "never yields"
        print(f"{label:<20} {time.perf_counter() - start:.2f} s, heartbeats: {len(beats)}")

asyncio.run(main())
```

The version that never yields gets one heartbeat in: the one before it started. The fixes, from
best to worst fit:

- **Use the async version** of the library: `await asyncio.sleep()`, `httpx.AsyncClient`,
  `asyncpg`, `aiofiles`.
- **Move blocking calls to a thread** with `await asyncio.to_thread(fn, *args)`, and CPU-heavy
  work to a process pool (lesson 6).
- **Yield now and then** with `await asyncio.sleep(0)` inside a long loop, when the work is short
  enough to stay on the loop but too long to do in one go.

> [!NOTE]
> This browser's Python lets other tasks run while `time.sleep()` waits, because the runtime
> suspends the whole Python stack. On a real machine it freezes the loop exactly as shown above,
> so the drills check your code for it rather than timing it.

> [!TIP]
> `asyncio.run(main(), debug=True)` (or the environment variable `PYTHONASYNCIODEBUG=1`) logs
> every step that holds the loop for more than 100 ms: `Executing <Task ...> took 0.302 seconds`.
> It's the quickest way to find a blocking call you didn't know about.

## Forgotten await

Calling a coroutine function without `await` creates a coroutine object and throws it away. The
body never runs. Worse, the object is **truthy**, so a check written without `await` always
passes:

```python
import asyncio

async def is_fraudulent(order):
    await asyncio.sleep(0.01)          # ask the fraud service
    return order["total"] > 5_000

async def main():
    order = {"id": "A-1042", "total": 40}
    if is_fraudulent(order):           # a coroutine object: always true
        print("blocked", order["id"])
    if await is_fraudulent(order):
        print("this line never prints")

asyncio.run(main())
```

A £40 order was blocked. Python notices only when the coroutine is garbage collected, and prints
`RuntimeWarning: coroutine 'is_fraudulent' was never awaited` to stderr, far from the bug. Type
checkers catch it earlier: mypy reports a coroutine call whose result is never used
(`[unused-coroutine]`), and ruff's `RUF006` rule flags a task whose reference is thrown away.

> [!JS]
> Coming from JavaScript: forgetting `await` on a Promise gives you a Promise, which is truthy too.
> The difference is that the JS function still ran. A Python coroutine you don't await never runs
> at all.

## Tasks that vanish

`asyncio.create_task()` schedules a coroutine and returns immediately, which makes "fire and
forget" tempting. Three things go wrong with a task nobody keeps hold of:

1. **Nobody waits for it.** The function that created it returns before the work is done, and if
   the program ends first, the work never happens.
2. **Nobody sees its errors.** Its exception sits in the task object until the task is garbage
   collected, then turns into a log message: `Task exception was never retrieved`.
3. **It can be garbage collected mid-flight.** The event loop keeps only a *weak* reference to
   each task. A task that's waiting on something only it refers to can be collected before it
   finishes, and its remaining code silently never runs.

The third one is rare and alarming, so here it is happening:

```python
import asyncio
import gc
import weakref

async def wait_for_confirmation(order_id, log):
    confirmed = asyncio.Event()        # nothing else refers to this event
    log.append(f"{order_id}: waiting for the payment provider")
    try:
        await confirmed.wait()
        log.append(f"{order_id}: confirmed")
    finally:
        log.append(f"{order_id}: task destroyed before it finished")

async def main():
    log = []
    alive = weakref.ref(asyncio.create_task(wait_for_confirmation("A-1042", log)))
    await asyncio.sleep(0)
    gc.collect()                       # a garbage collection happens to run
    await asyncio.sleep(0)
    print(log)
    print("the task still exists:", alive() is not None)

asyncio.run(main())
```

The fix for all three is the same: **keep a reference, and await it eventually**. Inside a
function, a `TaskGroup` does that for you. For work that really should outlive the function that
starts it, keep the tasks in a set and remove each one when it's done, which is the pattern the
asyncio documentation itself recommends:

```python
import asyncio

background_tasks = set()

async def send_receipt(order_id):
    await asyncio.sleep(0.01)
    print("receipt sent for", order_id)

async def checkout(order_id):
    task = asyncio.create_task(send_receipt(order_id))
    background_tasks.add(task)                          # a strong reference
    task.add_done_callback(background_tasks.discard)    # dropped when it finishes
    return f"{order_id}: paid"

async def main():
    print(await checkout("A-1042"))
    await asyncio.gather(*background_tasks)             # before shutting down

asyncio.run(main())
```

## Race conditions

A race condition is two pieces of code reading and changing the same data, where the result
depends on who gets there first. With threads, the switch can happen between any two bytecode
instructions (lesson 6). With asyncio, it can only happen at an `await`, which makes races rarer
and easier to find, but it doesn't make them impossible. The usual shape is **check, await, act**:

```python
import asyncio

seats_left = 2

async def book(customer, sold):
    global seats_left
    if seats_left > 0:                 # check
        await asyncio.sleep(0.01)      # charge the card: other bookings run here
        seats_left -= 1                # act, on a check that may now be out of date
        sold.append(customer)

async def main():
    sold = []
    await asyncio.gather(*(book(name, sold) for name in ["Ada", "Grace", "Linus", "Guido"]))
    print(sold, "seats left:", seats_left)

asyncio.run(main())
```

Four tickets sold for two seats. All four bookings checked before any of them had finished paying.
There are two fixes:

- **An `asyncio.Lock`.** `async with lock:` around the check, the await and the act lets only one
  booking at a time through that section. Other tasks still run; they just queue at the lock.
- **No await between the check and the act.** Reserve the seat first (`seats_left -= 1` straight
  after the check), then charge the card, and give the seat back if the charge fails. Between two
  awaits nothing else runs, so this needs no lock at all.

```python
import asyncio

seats_left = 2

async def book(customer, sold, lock):
    global seats_left
    async with lock:
        if seats_left == 0:
            return
        await asyncio.sleep(0.01)      # charge the card
        seats_left -= 1
        sold.append(customer)

async def main():
    sold, lock = [], asyncio.Lock()
    await asyncio.gather(*(book(name, sold, lock) for name in ["Ada", "Grace", "Linus", "Guido"]))
    print(sold, "seats left:", seats_left)

asyncio.run(main())
```

> [!WARNING]
> Use `asyncio.Lock` in async code and `threading.Lock` with threads, never the other way round.
> A `threading.Lock` held across an `await` blocks the whole event loop the moment a second task
> tries to take it, and nothing can ever release it.

```quiz
question: Which of these async functions has a race condition when many run at once on the same account?
options:
  - "balance = account.balance; account.balance = balance - amount (no await between them)"
  - "balance = await db.get_balance(); await db.set_balance(balance - amount)"
  - "async with account.lock: balance = await db.get_balance(); await db.set_balance(balance - amount)"
answer: 1
explain: "The second one awaits between reading and writing, so two withdrawals can both read the old balance. The first has no await in between, so nothing else can run; the third holds a lock across the whole read-modify-write."
```

## Where this leaves you

Anything slow between two awaits blocks every task: use async libraries, `to_thread`, or
`await asyncio.sleep(0)` in long loops, and let debug mode find what you missed. A coroutine you
don't await never runs and is always truthy. A task needs a strong reference and someone to await
it: a `TaskGroup`, or a set with `add_done_callback`. Races in asyncio happen across awaits: hold
an `asyncio.Lock` over check-await-act, or remove the await from between the check and the act. The
drills fix each of these bugs, then build the tools that prevent them.
