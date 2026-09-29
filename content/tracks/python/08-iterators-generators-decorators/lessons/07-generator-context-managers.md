---
slug: generator-context-managers
title: Generator-based context managers
summary: "@contextmanager turns a generator into a with block: next() runs the setup, the yield hands over the resource, and exceptions are thrown in at the yield."
minutes: 40
exercises:
  - gen-predict-contextmanager
  - gen-override-settings
  - gen-fix-transaction
  - gen-timed-block
  - gen-build-contextmanager
---

Module 6 showed `@contextmanager` as a recipe: put the setup before a `yield`, the cleanup after
it, and wrap the `yield` in `try`/`finally`. Now that you know what a generator is and what a
decorator is, the recipe stops being magic. `@contextmanager` is a decorator that turns a generator
function into something the `with` statement can drive, and every rule of the recipe falls out of
how it drives it.

## The with statement, in one screen

A `with` block works with any object that has two methods. `__enter__` runs at the start, and its
return value is what `as` binds. `__exit__` runs at the end, however the block ends, and receives
the exception if there was one:

```python
import time

class Timer:
    def __init__(self, label, log):
        self.label = label
        self.log = log

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc, tb):
        elapsed = time.perf_counter() - self.start
        self.log.append(f"{self.label}: {'failed' if exc_type else 'ok'}")
        return False            # don't suppress the exception

log = []
with Timer("nightly export", log):
    total = sum(range(1000))
log
```

A dozen lines of class for "do this before, that after". The generator version is the same
behaviour with the before and after in one function, in the order they run.

## A generator as a context manager

```python
import time
from contextlib import contextmanager

@contextmanager
def timer(label, log):
    start = time.perf_counter()
    try:
        yield
    finally:
        outcome = "ok"
        log.append(f"{label}: {time.perf_counter() - start:.3f}s")

log = []
with timer("nightly export", log):
    total = sum(range(1000))
len(log), log[0].startswith("nightly export")
```

Read it with lesson 2 in mind. `timer("nightly export", log)` doesn't run the body; with
`@contextmanager` it returns a context manager object holding a fresh generator. Entering the
`with` block calls `next()` on that generator, which runs the setup and pauses at `yield`. The
block runs while the generator's frame is suspended. Leaving the block resumes the generator,
which runs the cleanup and falls off the end.

The value the generator yields is what `as` binds, so a context manager that hands out a resource
yields it:

```python
from contextlib import contextmanager

@contextmanager
def connection(dsn, events):
    events.append(f"connect {dsn}")
    conn = {"dsn": dsn, "open": True}      # stands in for a real connection
    try:
        yield conn
    finally:
        conn["open"] = False
        events.append("disconnect")

events = []
with connection("postgres://orders", events) as conn:
    events.append(f"query on {conn['dsn']}")
events, conn["open"]
```

## What @contextmanager does with your generator

`@contextmanager` wraps your generator function so that each call returns an object with
`__enter__` and `__exit__`, and those two methods drive the generator:

- **`__enter__`** calls `next(gen)`, which runs everything up to the `yield`, and returns the yielded
  value. If the generator finishes without yielding, that's a bug: `RuntimeError: generator didn't
  yield`.
- **`__exit__` after a normal exit** calls `next(gen)` again, which runs the code after the `yield`.
  The generator should now finish (`StopIteration`). If it yields a second time instead, that's
  `RuntimeError: generator didn't stop`.
- **`__exit__` after an exception** calls `gen.throw(exc)`. The exception is raised **inside the
  generator, at the `yield` line**, as if the `yield` itself had raised it.

That third rule is the important one, and it's why the recipe insists on `try`/`finally`. Here's the
wrong way first. Without it, an exception in the block goes off at the `yield`, and the cleanup
after it never runs:

```python
from contextlib import contextmanager

@contextmanager
def locked(resource, events):
    events.append(f"lock {resource}")
    yield
    events.append(f"unlock {resource}")      # skipped if the block raises

events = []
try:
    with locked("invoice-1042", events):
        raise ConnectionError("payment gateway down")
except ConnectionError:
    pass
events
```

The invoice stays locked forever. With `try`/`finally` around the `yield`, the unlock runs whichever
way the block ends, and the exception carries on to the caller afterwards.

```quiz
question: "An exception is raised inside a `with` block whose context manager is a generator. Where does the generator first see it?"
options:
  - "In the code after the yield, as a return value"
  - "At the yield line, raised there by gen.throw()"
  - "It doesn't; @contextmanager handles it"
answer: 1
explain: __exit__ calls gen.throw(exc), which raises the exception at the paused yield. A try around the yield can catch it; without one, it propagates straight out and the code after the yield is skipped.
```

## Handling and suppressing exceptions

Because the exception arrives at the `yield`, the generator can catch it with an ordinary `except`.
What happens next depends on what the generator does:

- **Re-raise it** (or don't catch it) and it propagates out of the `with` statement.
- **Swallow it**, finishing normally, and the `with` statement suppresses it: the code after the
  block runs as if nothing had happened.

A database transaction uses both: commit when the block succeeds, roll back and re-raise when it
fails.

```python
from contextlib import contextmanager

@contextmanager
def transaction(log):
    log.append("begin")
    try:
        yield
    except Exception:
        log.append("rollback")
        raise
    else:
        log.append("commit")

log = []
with transaction(log):
    log.append("insert order A1042")
try:
    with transaction(log):
        raise ValueError("duplicate order")
except ValueError:
    log.append("caller saw the error")
log
```

Suppressing is rarely right, because it hides bugs. `contextlib.suppress(FileNotFoundError)` is the
standard, deliberate way to do it for one named exception.

> [!JS]
> Coming from JavaScript: the closest thing is the new `using` declaration, which calls
> `[Symbol.dispose]()` when a block ends. Python's `with` goes further: the cleanup sees the
> exception, and can handle it.

## Context managers that are also decorators

The object `@contextmanager` gives you is also a decorator. Put it above a function and the whole
function body runs inside the `with`:

```python
import time
from contextlib import contextmanager

@contextmanager
def timer(label, log):
    start = time.perf_counter()
    try:
        yield
    finally:
        log.append(label)

log = []

@timer("rebuild search index", log)
def rebuild_index():
    return "rebuilt"

rebuild_index(), rebuild_index(), log
```

This works because the object inherits from `contextlib.ContextDecorator`. A generator can only be
run once, so on each call to the decorated function it builds a **fresh** generator from the
arguments it was created with. A timer, a transaction or a lock written once can then be used both
ways.

> [!TIP]
> When the number of context managers isn't known in advance, such as one open file per input
> path, `contextlib.ExitStack` enters them one at a time and exits them all, in reverse order, when
> its own `with` block ends.

## Where this leaves you

`@contextmanager` turns a generator function into a context manager: `__enter__` runs it to the
`yield` and returns the yielded value, a normal exit resumes it, and an exception is thrown in at
the `yield`, which is why the `yield` belongs inside `try`/`finally`. Catching the exception there
handles it; letting it go re-raises it. The drills finish the module by building a transaction,
a timer that doubles as a decorator, and your own version of `@contextmanager`.
