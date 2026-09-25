---
slug: flexible-parameters
title: Flexible parameters
summary: Take any number of arguments, forward them on, and force a parameter to be passed by name or by position.
minutes: 35
exercises:
  - args-total-amounts
  - args-predict-unpacking
  - kwargs-build-query
  - args-keyword-only-flags
  - args-log-event
---

`print()` takes any number of values. `dict(name="Ada", role="admin")` takes any keywords you like.
`sorted(orders, key=...)` refuses `key` unless you name it. None of that is special to built-ins:
your own functions can do all three, and knowing how makes the signatures in the standard library
readable at a glance.

## *args: any number of positional arguments

A parameter written `*name` collects every **extra positional argument** into a tuple. The name
`args` is only a convention; pick one that says what's in it.

```python
def total(*amounts):
    return round(sum(amounts), 2)

total(12.5, 3.25), total(), total(9.99)
```

`amounts` is always a tuple, possibly empty. You can put ordinary parameters before it, and they
are filled first:

```python
def invoice_line(description, *amounts):
    return f"{description}: {sum(amounts):.2f} ({len(amounts)} items)"

invoice_line("Stationery", 4.5, 2.25, 1.0)
```

> [!JS]
> Coming from JavaScript: `*amounts` is a rest parameter, like `...amounts`. It gives you a tuple
> instead of an array, so it can't be changed in place.

## **kwargs: any number of keyword arguments

A parameter written `**name` collects every **keyword argument that doesn't match another
parameter** into a dict, in the order the caller wrote them.

```python
def tag_line(event, **fields):
    details = " ".join(f"{key}={value}" for key, value in fields.items())
    return f"{event} {details}"

tag_line("login", user="ada", ip="10.0.0.7", ok=True)
```

`fields` is a new dict on every call, so unlike a mutable default, it's safe to change.

## Unpacking at the call site

The same stars work the other way round when you **call** a function. `*sequence` spreads a list or
tuple into separate positional arguments, and `**mapping` spreads a dict into keyword arguments.

```python
def format_address(street, city, postcode):
    return f"{street}, {city} {postcode}"

parts = ["221B Baker Street", "London", "NW1 6XE"]
record = {"street": "4 Privet Drive", "city": "Little Whinging", "postcode": "GU12 4PX"}

format_address(*parts), format_address(**record)
```

Put the two together and a function can pass along whatever it was given, without knowing what
that is. This is how you'll write decorators in module 8:

```python
def audited(action, *args, **kwargs):
    print(f"calling {action.__name__} with {args} {kwargs}")
    return action(*args, **kwargs)

audited(round, 3.14159, ndigits=2)
```

```quiz
question: "Inside `def report(*rows, **options)`, what is `rows` when you call `report()`?"
options:
  - "None"
  - "()"
  - "[]"
answer: 1
explain: "*rows always collects a tuple, which is empty when there are no extra positional arguments. **options would likewise be an empty dict, {}."
```

## Keyword-only parameters

Any parameter after `*args` can only be filled **by keyword**, because `*args` has already swallowed
every remaining positional argument. If you don't need `*args`, a bare `*` gives you the same rule
without collecting anything:

```python
def export_report(rows, *, include_header=True, delimiter=","):
    lines = [delimiter.join(row) for row in rows]
    if include_header:
        lines.insert(0, delimiter.join(["name", "total"]))
    return "\n".join(lines)

print(export_report([["ada", "120"]], delimiter=";"))
```

Now nobody can write the unreadable version:

```python raises
def export_report(rows, *, include_header=True, delimiter=","):
    return rows

export_report([["ada", "120"]], False, ";")
```

That's the main use: flags and options that would be meaningless as a bare `True` or `";"` in a
call. The standard library does it all the time. `sorted(iterable, *, key=None, reverse=False)` is
why `sorted(orders, len)` is an error and `sorted(orders, key=len)` isn't.

## Positional-only parameters

The opposite rule: parameters **before a `/`** can only be filled by position.

```python raises
def percent_of(part, whole, /):
    return round(part / whole * 100, 1)

percent_of(whole=200, part=30)
```

Why forbid names? Two reasons, both about keeping your options open:

1. **The name isn't part of the promise.** Callers can't rely on it, so you can rename `part` later
   without breaking anyone. Many built-ins work this way: `len(obj=[1, 2])` is an error.
2. **It frees the name for `**kwargs`.** A positional-only parameter doesn't claim its name, so the
   caller can use the same word as an ordinary keyword:

```python
def log_event(message, /, **fields):
    return message, fields

log_event("password reset", message="sent by email", user="ada")
```

Without the `/`, the second `message=` would clash with the parameter and raise a `TypeError`.

## The full order

Every kind of parameter can appear in one signature. They always come in this order:

```python norun
def f(pos_only, /, normal, *args, kw_only, **kwargs): ...
```

| Part | Filled by |
|------|-----------|
| before `/` | position only |
| between `/` and `*` | position or keyword (the everyday kind) |
| `*args` | the leftover positional arguments, as a tuple |
| after `*` or `*args` | keyword only |
| `**kwargs` | the leftover keyword arguments, as a dict |

Most functions you write will only use the middle kind, plus defaults. Reach for the others when
they make calls clearer or safer.

```quiz
question: "Given `def charge(amount, /, currency, *, capture=True)`, which call works?"
options:
  - "charge(amount=10, currency=\"GBP\")"
  - "charge(10, \"GBP\", False)"
  - "charge(10, currency=\"GBP\", capture=False)"
answer: 2
explain: "amount is positional-only, so it can't be named. capture is keyword-only, so it can't be passed by position. currency, in the middle, accepts either."
```

## Where this leaves you

`*args` and `**kwargs` collect extra arguments into a tuple and a dict, and `*` and `**` in a call
spread them back out. A bare `*` makes the parameters after it keyword-only; a `/` makes the ones
before it positional-only. The drills put each one to work, ending with a logger whose signature
needs both.
