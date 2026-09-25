---
slug: eafp-and-idioms
title: Idioms and EAFP
summary: Try the operation and handle the failure, and let a few built-ins replace most of your flag-and-loop code.
minutes: 30
exercises:
  - idioms-parse-quantity
  - idioms-predict-try-else
  - idioms-fix-price-check
  - idioms-refactor-any-all
  - idioms-nested-setting
---

Code that works isn't always code that reads well. Experienced Python developers share a set of
habits: they try an operation and handle the failure instead of checking everything first, and they
reach for a built-in or a standard-library tool before writing a loop. This lesson covers the first
habit and the built-ins. The rest of the module is the standard library.

## Look before you leap, or just try it

There are two ways to deal with input that might be bad. **LBYL** ("look before you leap") checks
first and acts only if the check passes. **EAFP** ("easier to ask forgiveness than permission") does
the thing and handles the exception if it fails.

Here are both, turning quantity text from an order form into an `int`:

```python
def quantity_lbyl(text):
    if text.isdigit():
        return int(text)
    return 0


def quantity_eafp(text):
    try:
        return int(text)
    except ValueError:
        return 0


rows = ["3", " 4 ", "-2", "three"]
[quantity_lbyl(r) for r in rows], [quantity_eafp(r) for r in rows]
```

The LBYL version rejects `" 4 "` and `"-2"`, both of which `int()` handles perfectly well. The check
answered a different question ("is every character a digit?") from the one that mattered ("can this
become an int?"). The EAFP version asks `int()` itself, so it can't disagree with `int()`.

> [!JS]
> Coming from JavaScript: `int()` is strict. `int("12abc")` raises `ValueError`, where
> `parseInt("12abc")` quietly gives `12`, and `int("")` raises where `Number("")` gives `0`.

## Why checks drift from the truth

A check written by hand is a second copy of the rules, and second copies go stale. `isdigit()` looks
like the right test for "is this a number?", but it isn't:

```python
"²".isdigit(), "-3".isdigit(), "4.5".isdigit()
```

A superscript two counts as a digit, and a minus sign and a decimal point don't. So an LBYL check
built on `isdigit()` lets `"²"` through, and then `int()` fails anyway:

```python raises
text = "²"
if text.isdigit():
    quantity = int(text)
```

EAFP has a second advantage with anything outside your program. "Does this file exist?" followed by
"open it" leaves a gap in which another process can delete the file. Opening it and handling
`FileNotFoundError` has no gap. The check and the action are the same step.

## Keep the try block small

EAFP only works if you catch the failure you expect and nothing else. Here is the common way to get it
wrong: a big `try` block and a broad `except`.

```python
prices = {"mug": 8.5, "tea": 4.25}


def line_total(item, qty):
    try:
        return prices[item] * quantity   # typo: should be qty
    except Exception:
        return 0.0                       # meant for unknown items


line_total("mug", 2)
```

A mug costs 8.50, yet the result is `0.0`. The typo raised `NameError`, and `except Exception` treated
it as "unknown item". The bug is now invisible. Put only the line that can legitimately fail inside
`try`, and name the exception you expect:

```python
prices = {"mug": 8.5, "tea": 4.25}


def line_total(item, qty):
    try:
        price = prices[item]
    except KeyError:
        return 0.0
    return price * qty


line_total("mug", 2), line_total("cake", 1)
```

A `try` statement can also have an `else` block, which runs only when the `try` block raised nothing.
It's the place for code that should run on success but whose own errors you don't want to catch:

```python
def parse_weight(text):
    try:
        grams = float(text)
    except ValueError:
        print("not a weight:", text)
        return None
    else:
        print("parsed", grams)
        return grams


parse_weight("250"), parse_weight("heavy")
```

> [!WARNING]
> Never write a bare `except:`. It catches everything, including `KeyboardInterrupt` when someone
> presses Ctrl+C, and it hides typos exactly like the example above. Module 6 covers exceptions in
> depth; for now, always name the exception.

## When looking first is right

EAFP is the default, not a rule. Check first when:

- **Missing is normal, not exceptional.** If half your lookups miss, `dict.get` or `in` reads better
  than a `try` block, and it's what the next person expects.
- **The action can't be undone.** You can't un-send an email or un-charge a card. Validate the whole
  order before you start doing things with it.
- **The check is the real rule.** "Is this user an admin?" is a business check, not an attempt to
  predict whether an operation will crash.

```python
stock = {"mug": 12, "tea": 0}

# Missing is normal: get() with a default says it in one call
stock.get("mug", 0), stock.get("cake", 0), "tea" in stock
```

```quiz
question: A function reads a price from a dict, and most items are expected to be missing. Which is most Pythonic?
options:
  - "if item in prices: return prices[item]"
  - "prices.get(item, 0.0)"
  - "try: return prices[item] except KeyError: return 0.0"
answer: 1
explain: When missing is the common case, get() with a default states the intent in one call. The try version is correct but suggests that a miss is unusual.
```

## Built-ins that replace loops

A lot of loops exist only to set a flag or add something up. Python has a built-in for each of them:

| You'd write a loop to… | Use |
|--------------------------|-----|
| check that every item passes | `all(...)` |
| check that at least one item passes | `any(...)` |
| add values up | `sum(...)` |
| find the biggest or smallest by some measure | `max(..., key=...)`, `min(..., key=...)` |
| count from 1 while looping | `enumerate(items, start=1)` |

```python
orders = [
    {"id": "A1", "total": 42.0, "paid": True},
    {"id": "A2", "total": 1250.0, "paid": True},
    {"id": "A3", "total": 18.5, "paid": False},
]

all_paid = all(o["paid"] for o in orders)
any_large = any(o["total"] > 1000 for o in orders)
revenue = sum(o["total"] for o in orders if o["paid"])
biggest = max(orders, key=lambda o: o["total"])["id"]
all_paid, any_large, revenue, biggest
```

`o["paid"] for o in orders` inside the call is a comprehension without the square brackets. It hands
values over one at a time instead of building a list first (module 8 explains how). `any()` and
`all()` also stop at the first answer they're sure of, so `any()` on a million orders stops at the
first large one.

Two edge cases worth knowing: `max()` of an empty list raises, so pass `default=`; and `all()` of an
empty list is `True`, because no item failed.

```python
max([], default=0), sum([]), all([]), any([])
```

## The standard library replaces the rest

Python ships with a large standard library ("batteries included"). Most of the loops you'll be
tempted to write already exist in it, tested and fast:

| Instead of… | Reach for | Lesson |
|-------------|-----------|--------|
| a counting dict, a list-of-lists grouping dict | `collections.Counter`, `defaultdict` | 2 |
| index arithmetic, nested loops, manual chunking | `itertools` | 3 |
| recomputing the same answer | `functools.cache` | 4 |
| string-slicing dates | `datetime`, `zoneinfo` | 5 |
| chains of `split()` and `find()` | `re` | 6 |
| joining paths with `+ "/" +` | `pathlib` | 7 |

Import what you need at the top of the file. `from module import name` is the usual form for tools you
use often:

```python
from collections import Counter

statuses = [200, 200, 404, 200, 500, 404, 200]
Counter(statuses).most_common(2)
```

## Where this leaves you

Try the operation and catch the one exception you expect, in a `try` block that holds only the risky
line. Check first when missing is normal or the action can't be undone. And before writing a loop
that sets a flag or adds something up, reach for `any`, `all`, `sum`, `max` or `min`. The drills
practise all three habits.
