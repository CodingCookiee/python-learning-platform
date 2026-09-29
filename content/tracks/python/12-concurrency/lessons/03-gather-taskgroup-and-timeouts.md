---
slug: gather-taskgroup-and-timeouts
title: gather, TaskGroup, timeouts and cancellation
summary: Run many coroutines at once, decide what a failure does to the rest, and stop work that takes too long without leaking anything.
minutes: 45
exercises:
  - async-gather-prices
  - async-webhook-report
  - async-predict-taskgroup-failure
  - async-cheapest-quote
  - async-fix-swallowed-cancel
  - async-fastest-mirror
---

A shop fires a webhook to 40 partner systems every time an order ships. Creating 40 tasks by hand
and awaiting them one by one works, but it leaves three questions unanswered. How do you collect
all the results? What happens to the other 39 when one partner's server is down? And what if one of
them simply never answers? asyncio has a tool for each.

## gather: many coroutines, results in order

`asyncio.gather(*awaitables)` wraps each coroutine in a task, waits for all of them, and returns
their results as a list **in the order you passed them**, whatever order they finished in:

```python
import asyncio

async def fetch_rate(currency, delay):
    await asyncio.sleep(delay)
    print(f"  {currency} arrived")
    return {"GBP": 0.86, "USD": 1.17, "JPY": 171.3}[currency]

async def main():
    rates = await asyncio.gather(
        fetch_rate("GBP", 0.03),
        fetch_rate("USD", 0.01),
        fetch_rate("JPY", 0.02),
    )
    print(rates)

asyncio.run(main())
```

USD arrived first, but the list still reads GBP, USD, JPY. That makes `gather` easy to pair with
the inputs: `dict(zip(currencies, await asyncio.gather(*(fetch_rate(c) for c in currencies))))`.

> [!JS]
> Coming from JavaScript: `gather` is `Promise.all`. With `return_exceptions=True`, below, it's
> `Promise.allSettled`.

## When one of them fails

By default, the first exception raised by any of the awaitables propagates out of `gather`, and
the results of the others are lost. Worse, the others are **not cancelled**: they keep running in
the background, with nobody waiting for them.

Pass `return_exceptions=True` and exceptions are returned in the list, in place of a result. Now a
failure is data you can report:

```python
import asyncio

async def deliver(partner):
    await asyncio.sleep(0.01)
    if partner == "legacy-erp":
        raise ConnectionError("legacy-erp: connection refused")
    return f"{partner}: 200 OK"

async def main():
    partners = ["warehouse", "legacy-erp", "crm"]
    outcomes = await asyncio.gather(*(deliver(p) for p in partners), return_exceptions=True)
    for partner, outcome in zip(partners, outcomes):
        if isinstance(outcome, Exception):
            print(f"FAILED  {partner}: {outcome}")
        else:
            print(f"ok      {outcome}")

asyncio.run(main())
```

Check with `isinstance(outcome, Exception)`, not `BaseException`: a cancelled awaitable comes
back as a `CancelledError`, which is a `BaseException`, and usually means something else entirely
(more on that below).

> [!TIP]
> `asyncio.as_completed(aws)` is the other way to collect results: it gives them to you as they
> finish, fastest first. `for next_done in asyncio.as_completed(tasks): result = await next_done`.
> It's how you'd show progress, or act on the first answer.

## TaskGroup: structured concurrency

`gather` has an awkward default: a failure leaves the other tasks running unsupervised.
`asyncio.TaskGroup` (Python 3.11+) fixes that. Tasks created in a group belong to its `async with`
block, and the block doesn't exit until every one of them has finished:

```python
import asyncio

async def reserve(item, delay, fail=False):
    try:
        await asyncio.sleep(delay)
        if fail:
            raise ValueError(f"{item}: out of stock")
        print(f"reserved {item}")
        return item
    except asyncio.CancelledError:
        print(f"cancelled {item}")
        raise

async def main():
    try:
        async with asyncio.TaskGroup() as group:
            group.create_task(reserve("seat 14A", 0.01))
            group.create_task(reserve("hotel", 0.02, fail=True))
            group.create_task(reserve("rental car", 0.05))
    except* ValueError as failures:
        print("booking failed:", [str(error) for error in failures.exceptions])

asyncio.run(main())
```

When the hotel failed, the group **cancelled the rental car**, waited for it to stop, and then
raised an `ExceptionGroup` holding every failure, which `except*` (module 6) unpacks. That's what
**structured concurrency** means: tasks can't outlive the block that started them, so no task is
ever left running unsupervised, and no failure is ever silently dropped.

When everything succeeds, read the results after the block with `task.result()`:

```python
import asyncio

async def fetch_stock(sku):
    await asyncio.sleep(0.01)
    return {"ETH-1KG": 6, "MUG-STN": 5}[sku]

async def main():
    async with asyncio.TaskGroup() as group:
        tasks = {sku: group.create_task(fetch_stock(sku)) for sku in ["ETH-1KG", "MUG-STN"]}
    return {sku: task.result() for sku, task in tasks.items()}

asyncio.run(main())
```

| Use | When |
|-----|------|
| `TaskGroup` | Every task must succeed, and one failure makes the rest pointless. The default for new code. |
| `gather(..., return_exceptions=True)` | You want every outcome, success or failure, such as a delivery report. |
| `gather(...)` | Rarely: you want results in order and accept that a failure leaves the rest running. |

```quiz
question: Three tasks run in a TaskGroup. The second raises KeyError while the others are still waiting. What happens?
options:
  - "The KeyError propagates immediately and the other two keep running"
  - "The other two are cancelled, and the block raises an ExceptionGroup containing the KeyError"
  - "The other two finish, then the block raises the KeyError on its own"
answer: 1
explain: "A TaskGroup cancels the remaining tasks on the first failure, waits for them to stop, and raises every failure together in an ExceptionGroup. Plain gather is the one that leaves the others running."
```

## Timeouts

A network call that never returns is worse than one that fails: everything waiting on it waits
too. `asyncio.timeout(seconds)` (Python 3.11+) puts a limit on a block. If the block is still
running when time is up, whatever it's awaiting is cancelled, and the block raises `TimeoutError`:

```python
import asyncio

async def authorise_payment(order_id, provider_delay):
    await asyncio.sleep(provider_delay)
    return f"{order_id}: authorised"

async def main():
    for delay in (0.01, 0.5):
        try:
            async with asyncio.timeout(0.1):
                print(await authorise_payment("A-1042", delay))
        except TimeoutError:
            print("A-1042: the payment provider took too long, try the backup")

asyncio.run(main())
```

The limit covers everything inside the block, however many awaits that is. For a single
awaitable there's also `await asyncio.wait_for(coro, timeout=0.1)`, which does the same job.

## Cancellation and CancelledError

Timeouts and TaskGroups both stop work the same way: they **cancel** a task. `task.cancel()` asks
a task to stop, and the next time that task is paused at an `await`, the `await` raises
`asyncio.CancelledError` instead of returning. The exception unwinds the task's code, running
every `finally` and `with` block on the way out, which is where cleanup belongs:

```python
import asyncio

async def export_orders(orders):
    print("opened the export file")
    try:
        for order in orders:
            await asyncio.sleep(0.01)
            print("wrote", order)
    finally:
        print("closed the export file")

async def main():
    task = asyncio.create_task(export_orders(["A-1", "A-2", "A-3", "A-4"]))
    await asyncio.sleep(0.025)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print("cancelled:", task.cancelled())

asyncio.run(main())
```

`CancelledError` inherits from `BaseException`, not `Exception`, so an ordinary
`except Exception:` doesn't catch it. That's deliberate: cancellation has to get through the error
handling in your code.

> [!WARNING]
> Catching `CancelledError` to log or tidy up is fine, but then **re-raise it**. A coroutine that
> swallows it and returns normally tells its caller "I finished", so timeouts stop timing out and
> TaskGroups can't shut down. Prefer `finally:` for cleanup and you never have to think about it.

> [!JS]
> Coming from JavaScript: `AbortController` is a signal your code has to pass along and check.
> Python cancellation needs no plumbing: it's delivered automatically, at whichever `await` the
> task is paused on.

## Where this leaves you

`gather` returns results in argument order, and `return_exceptions=True` turns failures into
values. `TaskGroup` keeps tasks inside a block, cancels the rest when one fails, and raises every
failure in an `ExceptionGroup`. `asyncio.timeout` cancels whatever overruns and raises
`TimeoutError`. Cancellation arrives as `CancelledError` at an `await`: clean up in `finally`, and
never swallow it. The drills gather prices, report on webhooks, predict a TaskGroup failure, add
timeouts, fix a swallowed cancellation and race mirrors for the fastest answer.
