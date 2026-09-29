---
slug: async-iterators-and-context-managers
title: Async iterators, generators and context managers
summary: async for over data that arrives a page at a time, async generators that produce it, and async with for resources whose setup and cleanup have to wait.
minutes: 40
exercises:
  - async-large-orders
  - async-paginate-orders
  - async-predict-async-generator
  - async-transaction
  - async-fix-sync-protocols
  - async-merge-feeds
---

The orders API returns 100 orders per page, with a cursor pointing at the next page. You want to
write `for order in orders:` and let something else worry about the pages. In module 8 a generator
did exactly that. The difference here is that fetching the next page means awaiting, and an
ordinary `for` loop and an ordinary generator have nowhere to put an `await`. Python has an async
version of each protocol you already know: iteration, generators and context managers.

## async for and the async iteration protocol

The iteration protocol from module 8 has an async twin:

| Sync | Async |
|------|-------|
| `for item in obj:` | `async for item in obj:` |
| `__iter__()` returns the iterator | `__aiter__()` returns the iterator (a plain method) |
| `__next__()` returns the next item | `async def __anext__()` returns the next item |
| raises `StopIteration` when done | raises `StopAsyncIteration` when done |

Because `__anext__` is a coroutine, it can await a network call between items:

```python
import asyncio

PAGES = {None: (["A-1", "A-2"], "c2"), "c2": (["A-3", "A-4"], "c3"), "c3": (["A-5"], None)}

class OrderFeed:
    """Iterates over every order, fetching a page at a time."""

    def __init__(self):
        self.buffer = []
        self.cursor = None
        self.finished = False

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self.buffer:
            if self.finished:
                raise StopAsyncIteration
            await asyncio.sleep(0.01)                      # GET /orders?cursor=...
            self.buffer, self.cursor = PAGES[self.cursor]
            print(f"  fetched a page of {len(self.buffer)}")
            self.finished = self.cursor is None
        return self.buffer.pop(0)

async def main():
    async for order in OrderFeed():
        print(order)

asyncio.run(main())
```

Each page is fetched only when the loop has used up the last one. `async for` works only inside
an `async def`, for the same reason `await` does.

> [!JS]
> Coming from JavaScript: this is `for await (const order of feed)`, and `__aiter__` plays the
> part of `[Symbol.asyncIterator]`.

## Async generators

That class is a lot of bookkeeping for "loop over the pages and hand out the orders". As in
module 8, a generator does it in a few lines. An `async def` that contains `yield` is an **async
generator**: it can `await` between yields, and you consume it with `async for`:

```python
import asyncio

PAGES = {None: (["A-1", "A-2"], "c2"), "c2": (["A-3", "A-4"], "c3"), "c3": (["A-5"], None)}

async def fetch_page(cursor):
    await asyncio.sleep(0.01)
    return PAGES[cursor]

async def iter_orders():
    cursor = None
    while True:
        orders, cursor = await fetch_page(cursor)
        for order in orders:
            yield order
        if cursor is None:
            return

async def main():
    async for order in iter_orders():
        print(order)
    first_two = []
    async for order in iter_orders():
        first_two.append(order)
        if len(first_two) == 2:
            break
    return first_two

asyncio.run(main())
```

The second loop stopped after two orders, so only the first page was ever fetched. Async
generators are lazy, like the ones in module 8.

Two differences from ordinary generators: an async generator can't `return` a value (a bare
`return` just ends it), and it has no `yield from`. To pass on another async iterable's items,
write `async for item in inner: yield item`.

## Async comprehensions and anext

Comprehensions accept `async for` too, and `await` inside them. `anext()` and `aiter()` are the
async versions of `next()` and `iter()`:

```python
import asyncio

async def iter_amounts():
    for amount in [120.0, 8.5, 64.0, 310.0, 12.0]:
        await asyncio.sleep(0)
        yield amount

async def main():
    large = [amount async for amount in iter_amounts() if amount >= 50]
    first = await anext(iter_amounts())
    print("large:", large, "first:", first)

asyncio.run(main())
```

An async comprehension still has to run inside an `async def`, and it still reads the items one at
a time. It is not concurrent: to fetch several things at once you still need tasks or `gather`.

## Closing an async generator early

When you `break` out of `async for`, the generator is left paused at its `yield`. Its `finally`
blocks run only when it's closed, and closing an async generator means awaiting its `aclose()`
method. If you don't, asyncio closes it for you later, at a moment you don't control. When the
generator holds a connection, close it deliberately with `contextlib.aclosing`:

```python
import asyncio
from contextlib import aclosing

async def stream_rows(table):
    print(f"open cursor on {table}")
    try:
        for n in range(1, 1000):
            await asyncio.sleep(0)
            yield f"{table} row {n}"
    finally:
        print(f"close cursor on {table}")

async def main():
    async with aclosing(stream_rows("customers")) as rows:
        async for row in rows:
            print(row)
            if row.endswith("2"):
                break
    print("the cursor is already closed here")

asyncio.run(main())
```

## async with and async context managers

Some resources need to wait while they're set up or torn down: opening a database connection,
starting a transaction, flushing a buffer over the network. `async with` is `with` for them. An
**async context manager** has two coroutine methods, `__aenter__` and `__aexit__`, which receive
exactly what `__enter__` and `__exit__` do in module 6:

```python
import asyncio

class Transaction:
    def __init__(self, log):
        self.log = log

    async def __aenter__(self):
        await asyncio.sleep(0)             # send BEGIN to the database
        self.log.append("BEGIN")
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await asyncio.sleep(0)
        self.log.append("COMMIT" if exc_type is None else "ROLLBACK")
        return False                       # don't swallow the exception

async def main():
    log = []
    async with Transaction(log):
        log.append("UPDATE accounts SET balance = balance - 40 WHERE id = 7")
    try:
        async with Transaction(log):
            raise ValueError("insufficient funds")
    except ValueError:
        pass
    return log

asyncio.run(main())
```

Writing the class is rarely necessary. `@contextlib.asynccontextmanager` turns an async generator
into one, just as `@contextmanager` did for ordinary generators in module 8. Everything before the
`yield` is the setup, everything after it is the cleanup, and an exception from the `with` block
is raised at the `yield`:

```python
import asyncio
from contextlib import asynccontextmanager

@asynccontextmanager
async def connection(pool_name):
    await asyncio.sleep(0.01)              # connect
    print(f"connected to {pool_name}")
    try:
        yield f"<connection to {pool_name}>"
    finally:
        await asyncio.sleep(0)             # give it back to the pool
        print(f"released {pool_name}")

async def main():
    async with connection("reporting") as conn:
        print("querying with", conn)

asyncio.run(main())
```

> [!WARNING]
> `with` on an async context manager, or `for` over an async iterable, is a `TypeError`. Python
> 3.14's message even suggests the fix: `...does not support the context manager protocol (missed
> __exit__ method) but it supports the asynchronous context manager protocol. Did you mean to use
> 'async with'?`

```quiz
question: Which of these can you use inside an ordinary def function?
options:
  - "async with transaction(conn):"
  - "async for order in iter_orders():"
  - "asyncio.run(main())"
answer: 2
explain: "async with and async for need an event loop to await on, so they only work inside async def. asyncio.run() is the bridge the other way: ordinary code uses it to start a coroutine."
```

## Where this leaves you

`async for` drives objects with `__aiter__` and an async `__anext__`; async generators, an
`async def` with `yield`, are the short way to write them, and async comprehensions consume them.
Close one you leave early with `aclosing`. `async with` drives `__aenter__` and `__aexit__`, and
`@asynccontextmanager` writes both from one generator. The drills filter an async feed, paginate
an API, predict an async generator, build a transaction manager, fix sync code that meets async
objects, and merge several live feeds into one.
