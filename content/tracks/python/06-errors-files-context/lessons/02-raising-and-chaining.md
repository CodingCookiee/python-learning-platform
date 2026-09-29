---
slug: raising-and-chaining
title: Raising, re-raising and chaining
summary: Raise the right exception with a useful message, pass one on unchanged, and translate low-level errors without losing the original.
minutes: 35
exercises:
  - errors-refund-guard
  - errors-predict-chaining
  - errors-read-port
  - errors-fix-reraise
  - errors-parse-money
---

A service fails to start, and the log says `KeyError: 'port'`. Which file? Which setting? Is it a
bug or a typo in the config? A good error names the problem in the caller's terms ("config.toml
has no port setting") and still keeps the low-level cause for whoever debugs it. This lesson is
about the raising side: choosing the exception, passing one on, and chaining one to another.

## raise: say what's wrong, with the value

`raise` takes an exception object. Build it with a message that says what was wrong and shows the
offending value, so nobody has to reproduce the problem to understand it:

```python raises
def check_quantity(quantity):
    if not isinstance(quantity, int):
        raise TypeError(f"quantity must be a whole number, got {quantity!r}")
    if quantity < 1:
        raise ValueError(f"quantity must be at least 1, got {quantity}")
    return quantity


check_quantity(3)
check_quantity(0)
```

Pick the built-in type that describes the failure, because that's what callers will catch:

| Raise | When |
|-------|------|
| `ValueError` | the type is right but the value isn't: a negative quantity, a malformed date |
| `TypeError` | the value is the wrong type altogether: a list where a number was expected |
| `KeyError` / `LookupError` | something looked up by key or name doesn't exist |
| `NotImplementedError` | a method that subclasses must provide |
| `RuntimeError` | the program is in a state where the operation can't happen, and nothing more specific fits |

`raise ValueError` without brackets also works (Python creates the instance for you), but with no
message it's rarely what you want.

> [!JS]
> Coming from JavaScript: `raise ValueError("...")` is `throw new Error("...")`, with no `new`.
> Python only lets you raise exception objects, never a bare string or number.

## Passing an exception on with bare raise

Sometimes a function needs to *react* to an error without *handling* it: record it, undo a
half-finished step, then let it carry on to the caller. A bare `raise` inside an `except` block
re-raises the exception being handled, unchanged, with its original traceback:

```python
failed = []

def charge(card, amount):
    raise ConnectionError("payment gateway timed out")


def charge_and_record(card, amount):
    try:
        return charge(card, amount)
    except ConnectionError:
        failed.append((card, amount))     # remember it for the retry queue...
        raise                             # ...and let the caller decide what to do


try:
    charge_and_record("4242", 25)
except ConnectionError as error:
    print("caller sees:", repr(error))
failed
```

The caller still gets a `ConnectionError`, so its own `except ConnectionError` (say, a retry loop)
still works. Compare the tempting alternative, `raise Exception("charge failed")`: the type is gone,
the message is vaguer, and every caller that caught `ConnectionError` is now broken.

This is also the one respectable use of a broad clause: `except Exception:` followed by some
bookkeeping and a bare `raise` hides nothing, because the exception still escapes.

## Implicit chaining: an error while handling another

If a new exception is raised inside an `except` block, Python doesn't forget the first one. It
stores it on the new exception as `__context__`, and the full traceback shows both, oldest first,
joined by "During handling of the above exception, another exception occurred".

This site's error panel shows only the last exception, so the example prints the full traceback
itself with `traceback.format_exception`:

```python
import traceback

audit_log = None       # a bug: the log was never set up

def lookup_rate(rates, currency):
    try:
        return rates[currency]
    except KeyError:
        audit_log.append(f"unknown currency {currency}")   # raises AttributeError


try:
    lookup_rate({"EUR": 1.0}, "GBP")
except AttributeError as error:
    print("".join(traceback.format_exception(error)))
    print("context:", repr(error.__context__))
```

That's usually a bug in the handler, as here, and the chain is exactly what you need to find it:
the `AttributeError` is the bug, and the `KeyError` is what the handler was trying to deal with.

## Explicit chaining with from

When you *deliberately* turn a low-level error into a higher-level one, say so with
`raise NewError(...) from original`. The original is stored as `__cause__`, and the traceback
joins the two with "The above exception was the direct cause of the following exception":

```python
import traceback

def read_port(settings):
    try:
        text = settings["port"]
    except KeyError as error:
        raise ValueError("config has no port setting") from error
    return int(text)


try:
    read_port({"host": "db.internal"})
except ValueError as error:
    print("".join(traceback.format_exception(error)))
    print("cause:", repr(error.__cause__))
```

The caller catches one type, `ValueError`, whatever went wrong inside `read_port`, and gets a
message in its own terms. The person debugging still sees the `KeyError` and the line it came
from. This is called **exception translation**, and it's how a library keeps its internals out of
its callers' `except` clauses.

> [!JS]
> Coming from JavaScript: `raise ValueError("...") from error` is
> `throw new Error("...", { cause: error })`. The difference is that Python prints the cause in
> the traceback for you.

## Hiding the noise with from None

Sometimes the original exception adds nothing. A `KeyError` from your own dict lookup, or a
`ValueError` from splitting a string, is an implementation detail when your message already says
exactly what's wrong. `raise ... from None` suppresses the context, so the traceback shows only
your exception:

```python raises
CURRENCIES = {"EUR": "Euro", "GBP": "Pound sterling"}

def currency_name(code):
    try:
        return CURRENCIES[code]
    except KeyError:
        raise ValueError(f"unknown currency code {code!r}") from None


currency_name("EURO")
```

The original isn't deleted: it's still on `__context__`, and `__suppress_context__` is set to
`True` so the traceback leaves it out. Use `from None` only when you're sure the original tells
the reader nothing new. When in doubt, chain with `from error`.

```python
def currency_name(code):
    try:
        return {"EUR": "Euro"}[code]
    except KeyError:
        raise ValueError(f"unknown currency code {code!r}") from None


try:
    currency_name("EURO")
except ValueError as error:
    summary = (error.__cause__, repr(error.__context__), error.__suppress_context__)
summary
```

```quiz
question: "Inside `except KeyError as error:`, you write `raise ValueError('bad config') from error`. What is the ValueError's `__cause__`?"
options:
  - None
  - The KeyError
  - The ValueError itself
answer: 1
explain: from sets __cause__ to the exception you name. __context__ is set to the KeyError too, because it was being handled, but the traceback shows the explicit cause.
```

## Adding a note without changing the error

Sometimes you don't want a new exception at all. The error is right, but it lacks context that
only the caller knows, such as which row of a file it came from. `add_note()` attaches extra lines
that the traceback prints under the message, while the type and message stay the same:

```python
import traceback

def parse_row(line):
    sku, quantity = line.split(",")
    return sku, int(quantity)


lines = ["MUG-01,3", "LAMP-02,two", "PEN-05,10"]
try:
    for number, line in enumerate(lines, start=1):
        try:
            parse_row(line)
        except ValueError as error:
            error.add_note(f"while reading line {number}: {line!r}")
            raise
except ValueError as error:
    print("".join(traceback.format_exception_only(error)))
    print(error.__notes__)
```

Callers that catch `ValueError` still work, and whoever reads the traceback knows exactly where to
look.

## Where this leaves you

Raise the built-in type that fits, with a message that includes the bad value. Use bare `raise` to
pass an exception on after reacting to it. Chain with `raise ... from error` when you translate an
error, `from None` when the original is only noise, and `add_note()` when the error is right but
needs more context. In a traceback, "direct cause" means `from` was used on purpose; "during
handling" usually means a bug in an `except` block.
