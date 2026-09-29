---
slug: decorators-from-scratch
title: Decorators from scratch
summary: A decorator is a function that takes a function and returns a replacement, and the @ line is just an assignment that runs when the function is defined.
minutes: 40
exercises:
  - deco-predict-definition-time
  - deco-count-calls
  - deco-fix-audit-trail
  - deco-timed
  - deco-memoize
---

The billing module has twenty functions, and compliance wants every call to `refund`, `void` and
`credit` written to an audit trail. You could paste three lines of logging into each one, and
forget one, and paste a slightly different version into the next. Or you could write the logging
once, as a function that wraps other functions. That wrapper is a **decorator**, and by the end of
this lesson you'll be able to write one from nothing, because there is nothing to it beyond the
closures from module 3.

## Functions that take and return functions

Functions are objects: you can pass one to another function, and return one from it. Put those
together with a closure and you can build a new function that does something extra around an
existing one:

```python
def logged(func):
    def wrapper(*args, **kwargs):
        print(f"calling {func.__name__}{args}")
        return func(*args, **kwargs)
    return wrapper

def refund(order_id, amount):
    return f"refunded {amount:.2f} on {order_id}"

refund = logged(refund)
refund("A1042", 12.5)
```

`logged` receives the original `refund`, defines `wrapper`, which remembers `func` in its closure,
and returns `wrapper`. The last line rebinds the name `refund` to that wrapper. Callers still
write `refund("A1042", 12.5)`, but now they're calling `wrapper`, which prints and then calls the
original.

## The @ line is an assignment

Writing `refund = logged(refund)` after every function is clumsy, so Python has syntax for it:

```python norun
@logged
def refund(order_id, amount):
    ...
```

means exactly:

```python norun
def refund(order_id, amount):
    ...
refund = logged(refund)
```

The expression after `@` is evaluated, the function is created, the result of the expression is
called with the function, and whatever that returns is bound to the name. Nothing more. Two things
follow from that. First, the decorator runs **once, when the `def` runs**, which for a module is
at import time, not when the function is called:

```python
def logged(func):
    print(f"decorating {func.__name__}")
    def wrapper(*args, **kwargs):
        print(f"calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

print("defining refund")

@logged
def refund(order_id):
    return f"refunded {order_id}"

print("defined, now calling")
refund("A1042")
```

Second, a decorator can return anything. Returning the function unchanged is common: a decorator
that only **registers** a function, for example, adds it to a dict and hands it back:

```python
HANDLERS = {}

def handler(func):
    HANDLERS[func.__name__] = func
    return func                      # the function itself, unwrapped

@handler
def order_created(payload):
    return f"new order {payload['id']}"

HANDLERS["order_created"]({"id": "A1042"})
```

> [!JS]
> Coming from JavaScript: TC39 decorators (in TypeScript 5) have their own rules, a context object,
> and only work on classes and their members. A Python decorator is any callable that takes a
> function or class, and the `@` line is only shorthand for calling it.

## Pass everything through

A wrapper stands in for the original, so it has to accept whatever the original accepts and give
back whatever it returns. `*args, **kwargs` handles the first half. The second half is where the
most common decorator bug lives, the forgotten `return`:

```python
def logged(func):
    def wrapper(*args, **kwargs):
        print(f"calling {func.__name__}")
        func(*args, **kwargs)        # the result is computed, then dropped
    return wrapper

@logged
def invoice_total(lines):
    return sum(quantity * price for quantity, price in lines)

invoice_total([(2, 12.5), (1, 8.0)])
```

`None`. Nothing raises, and the decorated function silently stops working. Always
`return func(*args, **kwargs)`, or, when the wrapper does work afterwards, store the result, do the
work and return it.

```quiz
question: "A module has `@audited` above `def refund(...)`. When does `audited` itself run?"
options:
  - "Every time refund is called"
  - "Once, when the def statement runs, usually at import"
  - "The first time refund is called"
answer: 1
explain: "@audited is refund = audited(refund), executed right after the def. What runs on each call is the wrapper audited returned."
```

## What functools.wraps fixes

The wrapper is a different function, and it looks like one:

```python
def logged(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@logged
def refund(order_id, amount):
    """Refund part or all of an order."""

refund.__name__, refund.__doc__
```

The name is `wrapper` and the docstring is gone. That breaks more than `help()`. Log lines and
tracebacks name the wrong function; anything that looks functions up by name, such as the handler
registry above or a web framework's route table, sees every decorated function as `wrapper` and
lets them overwrite each other; and tools that read the signature see only `(*args, **kwargs)`.

`functools.wraps(func)` is itself a decorator, for the wrapper. It copies `__name__`, `__qualname__`,
`__doc__`, `__module__`, `__annotations__` and the function's `__dict__` from `func` onto the
wrapper, and sets `wrapper.__wrapped__ = func`:

```python
import inspect
from functools import wraps

def logged(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@logged
def refund(order_id, amount):
    """Refund part or all of an order."""

refund.__name__, refund.__doc__, inspect.signature(refund), refund.__wrapped__
```

`inspect.signature` follows `__wrapped__` to report the real parameters, and `__wrapped__` also
gives tests a way to reach the undecorated function. Put `@wraps(func)` on every wrapper you write;
there's no case where leaving it off helps.

## State that lives on the wrapper

A wrapper is an object like any other function, so it can carry attributes. That's a tidy home for
data the decorator collects, such as how often a function was called:

```python
from functools import wraps

def count_calls(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)
    wrapper.calls = 0
    return wrapper

@count_calls
def send_invoice(customer):
    return f"sent to {customer}"

send_invoice("Ada"), send_invoice("Grace"), send_invoice.calls
```

Each decorated function gets its own wrapper, so its own counter. A variable in the decorator's
scope, updated with `nonlocal`, works too, but only the wrapper attribute can be read from
outside.

## A timing decorator you can test

Timing a function means reading a clock before and after. Reading the real clock makes a test
flaky, so take the clock as a parameter with the real one as the default. Because a decorator is
just a function, a test can call it directly with a fake clock, without the `@` syntax:

```python
import time
from functools import wraps

def timed(func, clock=time.perf_counter):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = clock()
        try:
            return func(*args, **kwargs)
        finally:
            wrapper.timings.append(clock() - start)
    wrapper.timings = []
    return wrapper

ticks = iter([100.0, 100.25])
nightly_export = timed(lambda: "exported", clock=lambda: next(ticks))
nightly_export(), nightly_export.timings
```

The `try`/`finally` records the time even when the function raises, and the `return` inside `try`
still returns the result. Writing `@timed` uses the real clock; the next lesson shows how to pass
arguments with the `@` syntax itself.

## Where this leaves you

A decorator takes a function and returns a replacement, usually a closure that calls the original.
`@deco` above a `def` is `name = deco(name)`, run once at definition time. Wrappers take
`*args, **kwargs`, return the original's result, and use `@wraps(func)` so the function keeps its
name, docstring and signature. The drills have you predict when decorators run and build counting,
auditing, timing and caching decorators.
