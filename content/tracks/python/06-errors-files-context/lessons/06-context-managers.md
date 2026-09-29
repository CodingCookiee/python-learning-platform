---
slug: context-managers
title: Writing context managers
summary: What with really does, how to write context managers as classes and with contextlib, and what __exit__'s return value decides.
minutes: 40
exercises:
  - ctx-predict-exit
  - ctx-transaction
  - ctx-override-settings
  - ctx-refactor-exitstack
  - ctx-error-collector
---

Every file in this module has been opened in a `with` block, because `with` guarantees the file is
closed. The same need comes up constantly: release a lock, commit or roll back a database
transaction, restore a setting you changed for a test, stop a timer. A **context manager** packages
"set up, then always clean up" into an object that `with` knows how to drive, and you can write
your own.

## What with actually does

A context manager is any object with two methods, `__enter__` and `__exit__`. This:

```python norun
with manager as value:
    body()
```

does roughly this:

```python norun
value = manager.__enter__()
try:
    body()
except BaseException as error:
    if not manager.__exit__(type(error), error, error.__traceback__):
        raise                      # __exit__ returned something falsy: the error carries on
else:
    manager.__exit__(None, None, None)
```

So `__enter__` runs first, and whatever it returns is bound to the name after `as`. `__exit__`
always runs when the block ends. It's told whether an exception happened, and it decides whether
that exception carries on. A file object's `__enter__` returns the file itself, and its `__exit__`
closes it:

```python
import tempfile
from pathlib import Path

path = Path(tempfile.mkdtemp()) / "receipt.txt"
try:
    with open(path, "w", encoding="utf-8") as receipt:
        receipt.write("Mug  8.50\n")
        raise ValueError("printer out of paper")
except ValueError:
    pass

receipt.closed, path.read_text(encoding="utf-8")
```

The file was closed, and what was written before the error was saved, even though the block
didn't finish.

> [!JS]
> Coming from JavaScript: this is explicit resource management, `using receipt = openFile(...)`,
> which calls `[Symbol.dispose]()` when the scope ends. Python's `__exit__` also gets told about
> any exception, and can choose to swallow it.

## A context manager as a class

Write `__enter__` to do the setup and return the value for `as` (often `self`). Write
`__exit__(self, exc_type, exc, tb)` to clean up: the three arguments are the exception's type, the
exception, and its traceback, or three `None`s if the block finished normally.

```python
class AuditedStep:
    """Record when a step of the nightly job starts and how it ends."""

    def __init__(self, name, log):
        self.name = name
        self.log = log

    def __enter__(self):
        self.log.append(f"start {self.name}")
        return self

    def __exit__(self, exc_type, exc, tb):
        outcome = "ok" if exc_type is None else f"failed with {exc_type.__name__}"
        self.log.append(f"end {self.name}: {outcome}")


log = []
with AuditedStep("import payments", log):
    pass
try:
    with AuditedStep("send invoices", log):
        raise ConnectionError("mail server down")
except ConnectionError:
    log.append("the job carried on")
log
```

## What __exit__'s return value decides

`AuditedStep.__exit__` returns `None`, which is falsy, so the `ConnectionError` carried on out of the
`with` block to the `try` around it. Return a **truthy** value and the exception is suppressed: it
stops at the end of the `with` block, and the code after the block runs as if nothing happened.

That's how you'd write a manager that ignores one expected error:

```python
import tempfile
from pathlib import Path

class IgnoreMissingFile:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return exc_type is not None and issubclass(exc_type, FileNotFoundError)


missing = Path(tempfile.mkdtemp()) / "yesterday-export.csv"
with IgnoreMissingFile():
    open(missing, encoding="utf-8")
print("carried on: the missing export was expected")
```

```python raises
class IgnoreMissingFile:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return exc_type is not None and issubclass(exc_type, FileNotFoundError)


with IgnoreMissingFile():
    int("not a number")     # a ValueError isn't suppressed
```

> [!WARNING]
> An `__exit__` that always returns `True` is a bare `except: pass` in disguise: every error in the
> block vanishes, including your bugs. Return `True` only for the exception types you mean to
> swallow, and let the method fall off its end (returning `None`) otherwise.

```quiz
question: "A block inside `with manager:` raises KeyError, and manager.__exit__ returns None. What happens next?"
options:
  - "The KeyError is suppressed, because __exit__ handled it"
  - "The KeyError carries on, after __exit__ has run"
  - "__exit__ isn't called, because the block didn't finish"
answer: 1
explain: __exit__ always runs, and it's told about the KeyError. None is falsy, so Python re-raises the exception once __exit__ returns. Only a truthy return value suppresses it.
```

## Several managers in one with

One `with` can hold several managers, separated by commas. They're entered left to right and exited
in the reverse order, like nested `with` blocks. With brackets, the list can span several lines:

```python
import tempfile
from pathlib import Path

folder = Path(tempfile.mkdtemp())
(folder / "orders.csv").write_text("A1001,12.50\nA1002,8.00\n", encoding="utf-8")

with (
    open(folder / "orders.csv", encoding="utf-8") as source,
    open(folder / "orders-copy.csv", "w", encoding="utf-8") as copy,
):
    for line in source:
        copy.write(line)

(folder / "orders-copy.csv").read_text(encoding="utf-8")
```

## contextlib.contextmanager: a function instead of a class

Writing a class with two methods is a lot of ceremony for "do this before, and that after".
`contextlib.contextmanager` turns a function into a context manager. The function contains one
`yield`: the code before it is the setup, the value yielded is what `as` binds, and the code after
it is the cleanup.

It uses a **generator**, a function that can pause at `yield` and resume later. Module 8 explains
exactly how that works; for now, use this shape as a recipe. Here is the wrong way first, with no
`try`:

```python
from contextlib import contextmanager

@contextmanager
def maintenance_mode(shop):
    shop["open"] = False
    yield shop
    shop["open"] = True           # skipped if the block raises


shop = {"open": True}
try:
    with maintenance_mode(shop):
        raise RuntimeError("price update failed")
except RuntimeError:
    pass
shop
```

The shop stayed closed. When the block raises, the exception is raised *at the `yield`*, inside
your function, so the line after it never runs. Wrap the `yield` in `try`/`finally`:

```python
from contextlib import contextmanager

@contextmanager
def maintenance_mode(shop):
    shop["open"] = False
    try:
        yield shop
    finally:
        shop["open"] = True       # runs whether the block finished or raised


shop = {"open": True}
try:
    with maintenance_mode(shop):
        raise RuntimeError("price update failed")
except RuntimeError:
    pass
shop
```

To suppress an exception in this style, catch it around the `yield` with `try`/`except` instead of
`finally`; an exception you catch and don't re-raise is suppressed.

## suppress and ExitStack

`contextlib` has two more tools worth knowing. `suppress(*types)` is the ready-made version of
`IgnoreMissingFile` above: it swallows the listed exception types and nothing else. It reads well
for one-line "it's fine if this fails" operations:

```python
import tempfile
from contextlib import suppress
from pathlib import Path

stale_lock = Path(tempfile.mkdtemp()) / "import.lock"
with suppress(FileNotFoundError):
    stale_lock.unlink()           # no lock file? nothing to clean up
"carried on"
```

`ExitStack` is for when you don't know how many managers you need until the program runs, such as
one file per branch in a list. `enter_context()` enters a manager and registers its exit, and when
the `with ExitStack()` block ends, every registered exit runs, newest first, even if one of them
raises:

```python
import tempfile
from contextlib import ExitStack
from pathlib import Path

folder = Path(tempfile.mkdtemp())
for branch in ["leeds", "york", "hull"]:
    (folder / f"{branch}.txt").write_text(f"{branch} 1200\n", encoding="utf-8")

paths = sorted(folder.glob("*.txt"))
with ExitStack() as stack:
    files = [stack.enter_context(open(path, encoding="utf-8")) for path in paths]
    first_lines = [file.readline().strip() for file in files]

first_lines, all(file.closed for file in files)
```

`stack.callback(function, *args)` registers any cleanup function in the same way.

## Where this leaves you

`with` calls `__enter__`, binds its result with `as`, and always calls `__exit__`, which learns
about any exception and suppresses it only by returning something truthy. Write a class when the
manager has state worth keeping, and `@contextmanager` with `try`/`finally` around the `yield` for
before-and-after code. Reach for `suppress` to ignore one expected error, and `ExitStack` when the
number of managers is only known at run time.
