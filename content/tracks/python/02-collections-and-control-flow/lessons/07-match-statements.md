---
slug: match-statements
title: Pattern matching with match
summary: match compares a value against patterns that describe its shape, and pulls out the pieces you need in the same step.
minutes: 40
exercises:
  - match-http-status
  - match-predict-patterns
  - match-fix-capture
  - match-cart-command
  - match-webhook-event
---

Commands typed by a user, JSON from a webhook, a row from a CSV file: a lot of real data arrives as
nested lists and dicts, and the first job is working out which kind you've got. You can do it with a
chain of `if`/`elif` checks on lengths, keys and types, but it gets messy fast. A `match` statement
describes each shape you expect as a **pattern**, and when one fits, binds the parts you care about
to names.

## Matching values

The simplest patterns are literal values. `match` tries each `case` from top to bottom and runs the
first one that fits. `|` means "any of these", and `_` matches anything, so it goes last as the
catch-all.

```python
def status_text(code):
    match code:
        case 200:
            return "OK"
        case 301 | 302:
            return "Redirect"
        case 404:
            return "Not found"
        case _:
            return "Something else"

status_text(200), status_text(302), status_text(418)
```

Only one case runs. There's no fall-through into the next case and no `break` to forget. If no case
matches and there's no `_`, nothing happens at all: the statement doesn't raise.

> [!JS]
> Coming from JavaScript: `match` looks like `switch` but doesn't fall through, needs no `break`, and
> can match the structure of lists and dicts, not only single values.

## Capture patterns, and a trap

A bare name in a pattern doesn't compare against anything. It's a **capture**: it matches any value
and binds that value to the name. That's useful inside bigger patterns (you'll see why in a moment),
but on its own it's a classic mistake:

```python raises
SHIPPED = "shipped"

def order_message(status):
    match status:
        case SHIPPED:
            return "On its way"
        case "paid":
            return "Preparing your order"
```

`case SHIPPED:` doesn't mean "equal to the constant SHIPPED". It means "match anything and call it
`SHIPPED`", which would make every later case unreachable, so Python refuses to compile it. If the
capture were the last case, Python would accept it, and it would silently catch every status.

To compare against a named constant, the name must be **dotted**, like an attribute of a module:

```python
from http import HTTPStatus

def describe(code):
    match code:
        case HTTPStatus.OK:
            return "fine"
        case HTTPStatus.NOT_FOUND:
            return "missing"
        case _:
            return "other"

describe(404)
```

Otherwise, write the literal value, or use a guard (below).

## Sequence patterns

A pattern in square brackets matches a list or tuple **of that length**, and each position can be a
literal, a capture or another pattern. A starred capture takes "the rest", like starred unpacking.
This makes a small command parser almost trivial:

```python
def run(command):
    match command.split():
        case ["add", item]:
            return f"added one {item}"
        case ["add", item, quantity]:
            return f"added {quantity} {item}"
        case ["remove", *items]:
            return f"removed {len(items)} items"
        case ["clear"]:
            return "cart cleared"
        case []:
            return "nothing typed"
        case _:
            return "unknown command"

run("add mug"), run("add tee 3"), run("remove mug tee cap"), run("   "), run("dance")
```

Each case checks the length and the literal words and binds the rest, in one line. Strings are
**not** treated as sequences here, so `case [x]` never matches the string `"a"`; that's deliberate,
because you almost never want a string split into characters.

## Mapping patterns

A pattern in curly braces matches a dict that **has** those keys. Extra keys are ignored, which is
exactly right for JSON payloads that grow new fields over time. Values in the pattern can be literals,
captures or nested patterns.

```python
def handle(event):
    match event:
        case {"type": "order.paid", "order": {"id": order_id}}:
            return f"ship {order_id}"
        case {"type": "order.cancelled", "order": {"id": order_id}, "reason": reason}:
            return f"cancel {order_id}: {reason}"
        case {"type": kind}:
            return f"ignored {kind}"

handle({"type": "order.paid", "order": {"id": "ORD-1042", "total": 59.9}, "sent_at": "09:14"})
```

```python
def handle(event):
    match event:
        case {"type": "order.paid", "order": {"id": order_id}}:
            return f"ship {order_id}"
        case {"type": kind}:
            return f"ignored {kind}"

handle({"type": "customer.updated", "customer": {"id": 7}}), handle({"order": "ORD-1"})
```

The second call matches neither case, so `handle` returns `None`. `**rest` in a mapping pattern
captures the remaining keys as a dict, if you need them.

## Class patterns

`int()`, `str()`, `float()`, `list()` and `dict()` in a pattern check the value's **type**, and
`str(name)` checks the type and captures the value. This is how you check that a payload's fields
have the types you expect before using them:

```python
def parse_amount(value):
    match value:
        case int(amount) | float(amount):
            return round(amount, 2)
        case str(text) if text.replace(".", "", 1).isdigit():
            return round(float(text), 2)
        case _:
            return None

parse_amount(12), parse_amount(9.999), parse_amount("4.50"), parse_amount("free")
```

The same syntax works with your own classes, which you'll write in module 5.

> [!WARNING]
> `True` and `False` are a kind of `int` in Python (`True == 1`), so `case int()` matches booleans
> too. If a boolean would be a mistake, put a `case bool():` above the `int()` case to catch it first.

## Guards

A pattern checks shape; a **guard** adds any extra condition. Write `if condition` after the pattern.
The guard runs only if the pattern matched, and it can use the names the pattern captured. If the
guard is false, `match` moves on to the next case.

```python
def check_quantity(words):
    match words:
        case ["add", item, quantity] if quantity.isdigit() and int(quantity) > 0:
            return f"add {quantity} {item}"
        case ["add", item, quantity]:
            return f"bad quantity: {quantity}"
        case _:
            return "unknown"

check_quantity(["add", "mug", "3"]), check_quantity(["add", "mug", "lots"]), check_quantity(["add", "mug", "0"])
```

```quiz
question: "Which case handles `[\"add\", \"mug\", \"0\"]` in the example above?"
options:
  - "The first, because the pattern matches"
  - "The second, because the first case's guard is false"
  - "The last, because 0 is falsy"
answer: 1
explain: "The first pattern fits, so its guard runs: int(\"0\") > 0 is false, so match moves on. The second pattern fits too and has no guard, so it wins."
```

## When to reach for match

Use `match` when you're branching on the **shape** of data: which command, which kind of event, which
layout of tuple. For a simple comparison of one value, like `if total > 100:`, a plain `if` is still
clearer. And patterns are tried in order, so put the specific cases first and the general ones last.

## Where this leaves you

`match` tries cases in order. Literals and `|` compare values, bare names capture, `_` catches the
rest, `[...]` matches sequences by length, `{...}` matches dicts by key, `int()`-style patterns check
types, and guards add conditions. The drills finish with a webhook handler that uses all of them.
