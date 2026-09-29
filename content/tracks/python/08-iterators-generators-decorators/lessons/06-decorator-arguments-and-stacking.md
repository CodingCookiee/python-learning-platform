---
slug: decorator-arguments-and-stacking
title: Decorator arguments, stacking and class decorators
summary: Decorators that take arguments are three functions deep, stacked decorators apply bottom-up and run top-down, and a class can be decorated too.
minutes: 45
exercises:
  - deco-predict-stacking
  - deco-fix-require-role
  - deco-retry
  - deco-event-registry
  - deco-validate-args
---

`@retry` is only useful if you can say how many times, and `@require_role` only if you can say
which role. Decorators that take settings are one level deeper than the ones in the last lesson,
and once there are several of them on one function, the order they're written in changes what the
function does. This lesson covers both, then decorators for classes, and finishes with the
practical decorators you'll meet in real codebases.

## Decorators with arguments are three levels deep

`@audited` takes the function. `@audited(action="refund")` has to take the setting **first**, and
then the function. So `audited` becomes a **decorator factory**: a function that takes the
settings and returns a decorator, which takes the function and returns a wrapper.

```python
from functools import wraps

TRAIL = []

def audited(action):                        # level 1: the settings
    def decorate(func):                     # level 2: the function
        @wraps(func)
        def wrapper(*args, **kwargs):       # level 3: each call
            TRAIL.append((action, args))
            return func(*args, **kwargs)
        return wrapper
    return decorate

@audited(action="refund")
def refund(order_id, amount):
    return f"refunded {amount:.2f} on {order_id}"

refund("A1042", 12.5), TRAIL
```

The desugaring rule from the last lesson hasn't changed. The expression after `@` is evaluated
first, and here that expression is a call:

```python norun
refund = audited(action="refund")(refund)
```

`audited(action="refund")` runs once and returns `decorate`; `decorate(refund)` returns `wrapper`.
Each level's closure remembers the one above it, so `wrapper` can still see `action` long after
`audited` has returned.

## The missing brackets

Forget the brackets and the function lands in the wrong level. `@audited` calls
`audited(refund)`, so `action` is the function, and `refund` is bound to `decorate`:

```python raises
from functools import wraps

def audited(action):
    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorate

@audited
def refund(order_id, amount):
    return f"refunded {amount:.2f} on {order_id}"

refund("A1042", 12.5)
```

`decorate() takes 1 positional argument but 2 were given` is the telltale sign: the call went to
the middle level. When a decorator has settings, write the brackets even if you want the defaults:
`@retry()`.

> [!TIP]
> Libraries often accept both `@retry` and `@retry(times=5)` with `def retry(func=None, *, times=3)`:
> if `func` is given, decorate it straight away; otherwise return the decorator. It's a nice touch
> for a library, and more ceremony than most application code needs.

## Stacking decorators

Several decorators on one function stack like this:

```python norun
@authenticated
@audited(action="refund")
def refund(order_id, amount):
    ...
```

which means `refund = authenticated(audited(action="refund")(refund))`. The decorator nearest the
`def` wraps the function first, and the top one wraps the result, so the top one is on the
**outside**. When the function is called, the outermost wrapper runs first. You can watch both
orders:

```python
from functools import wraps

def step(label):
    print(f"building {label}")
    def decorate(func):
        print(f"wrapping with {label}")
        @wraps(func)
        def wrapper(*args, **kwargs):
            print(f"{label}: before")
            result = func(*args, **kwargs)
            print(f"{label}: after")
            return result
        return wrapper
    return decorate

@step("auth")
@step("audit")
def refund(order_id):
    print(f"refunding {order_id}")

print("--- calling")
refund("A1042")
```

The factories run top to bottom (`building auth`, `building audit`), the decorators apply bottom
to top (`audit` wraps first), and the calls run from the outside in and back out, like nested
`with` blocks.

The order is a design decision. `@authenticated` above `@audited` means an unauthenticated call is
refused before it reaches the audit trail; swap them and every refused attempt is audited too,
which may be exactly what compliance wants. Timing outside a retry measures all the attempts
together; timing inside it measures each attempt.

```quiz
question: "`@timed` is written above `@retry(times=3)` on `sync_crm`, and the first two attempts fail. What does timed measure?"
options:
  - "Only the successful third attempt"
  - "All three attempts together, including any waiting between them"
  - "Each attempt separately"
answer: 1
explain: timed is the outer wrapper, so it starts its clock, calls the retry wrapper, and stops the clock only when that returns, after every attempt.
```

## Decorating a class

A decorator doesn't have to take a function. `@dataclass` and `@total_ordering`, from module 5,
are **class decorators**: functions that take a class, change or register it, and return it. The
desugaring is the same, `Invoice = dataclass(Invoice)`.

A common use is a registry, so that code can find classes by name without a big `if` chain.
Webhook events are a good example:

```python
EVENT_TYPES = {}

def event(name):
    def register(cls):
        cls.event_name = name
        EVENT_TYPES[name] = cls
        return cls
    return register

@event("order.created")
class OrderCreated:
    def __init__(self, order_id):
        self.order_id = order_id

payload = {"type": "order.created", "data": {"order_id": "A1042"}}
received = EVENT_TYPES[payload["type"]](**payload["data"])
type(received).__name__, received.order_id, OrderCreated.event_name
```

Returning `cls` itself, rather than a wrapper, keeps `isinstance`, subclassing and the class's name
working. That's almost always what you want from a class decorator.

> [!NOTE]
> A class can also **be** a decorator: give it `__init__(self, func)` and `__call__(self, *args,
> **kwargs)`, and call `functools.update_wrapper(self, func)`. It works for plain functions, but not
> for methods, because an instance isn't bound to `self` the way a function is (module 11 explains
> why). A closure is simpler and works everywhere.

## Practical decorators

Most decorators in real code are one of a few shapes, and the drills build each one:

- **Retry** calls the function again when it raises a temporary error, waiting a little longer each
  time. The wait goes through an injectable `sleep`, so tests don't actually wait.
- **Validation** checks arguments before the call and raises a clear error instead of letting bad
  data reach the database.
- **Caching** remembers results by arguments. `functools.cache` and `lru_cache` are exactly this, and
  they're decorators you already know.
- **Registration** adds a function or class to a table, and returns it unchanged.

Here is the core of a retry decorator, with the settings that make it testable:

```python
import time
from functools import wraps

def retry(times=3, sleep=time.sleep):
    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except ConnectionError:
                    if attempt == times:
                        raise
                    sleep(1)
        return wrapper
    return decorate

waits = []
responses = iter([ConnectionError("timeout"), ConnectionError("timeout"), "200 OK"])

@retry(times=3, sleep=waits.append)      # record the waits instead of waiting
def ping_crm():
    response = next(responses)
    if isinstance(response, Exception):
        raise response
    return response

ping_crm(), waits
```

A bare `raise` in the last attempt re-raises the original exception with its traceback, so the
caller sees the real error, not a vague "retry failed".

## Where this leaves you

A decorator with settings is a factory that returns the decorator: three levels, with
`f = factory(settings)(f)` underneath. Stacked decorators apply from the bottom up and run from the
top down, so their order is part of the design. Class decorators take and return a class, which
suits registries. The drills have you predict a stack, fix a factory missing its middle level, and
build retry, registry and validation decorators.
