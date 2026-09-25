---
slug: dicts
title: Dicts, views and merging
summary: A dict maps keys to values. get, setdefault and the | operator cover counting, grouping and layering settings.
minutes: 40
exercises:
  - dicts-stock-level
  - dicts-predict-merge
  - dicts-count-status
  - dicts-group-by-customer
  - dicts-price-list
---

A list finds things by position. A **dict** finds things by key: a SKU to its stock count, a
customer ID to their email, a setting name to its value. Looking up a key takes the same time whether
the dict has ten entries or ten million, which is why dicts are everywhere in Python, including
inside the language itself.

## Keys and values

Curly braces with `key: value` pairs make a dict. Square brackets look a key up, and assigning to a
key adds it or replaces its value.

```python
stock = {"MUG-01": 12, "TEE-02": 0, "CAP-03": 7}

mugs = stock["MUG-01"]
stock["SCARF-04"] = 5        # a new key
stock["TEE-02"] = 20         # replaces the value

mugs, stock, len(stock), "CAP-03" in stock
```

`in` checks the **keys**, not the values. Looking up a key that isn't there raises `KeyError`:

```python raises
stock = {"MUG-01": 12, "TEE-02": 0}
stock["HAT-09"]
```

> [!JS]
> Coming from JavaScript: a dict is like an object or a `Map`, but there's no `stock.MUG` dot access,
> a missing key raises instead of giving `undefined`, and keys can be numbers or tuples, not only
> strings.

## What can be a key

Any **hashable** value can be a key. In practice that means immutable ones: strings, numbers,
booleans, `None`, and tuples of those. A tuple key is a neat way to index by two things at once:

```python
seats = {("A", 1): "Ada", ("A", 2): "Grace", ("B", 1): "Linus"}

seats[("A", 2)]
```

Python finds a key by computing its hash, a number derived from its value, and jumping straight to
that slot. If a key could change after it was stored, its hash would change and the dict could never
find it again. That's why mutable values like lists are refused:

```python raises
visits = {["home", "pricing"]: 3}
```

## Reading safely with get

`get(key, default)` returns the value if the key is there and the default if it isn't. Leave the
default out and you get `None`. It never raises and never changes the dict.

```python
stock = {"MUG-01": 12, "TEE-02": 0}

stock.get("MUG-01", 0), stock.get("HAT-09", 0), stock.get("HAT-09")
```

Removing works in two ways: `del stock[key]` (raises if the key is missing) and `stock.pop(key,
default)`, which returns the removed value, or the default if there was nothing to remove.

```python
stock = {"MUG-01": 12, "TEE-02": 0}

removed = stock.pop("TEE-02", None)
not_there = stock.pop("HAT-09", None)

removed, not_there, stock
```

## Looping and views

Looping over a dict gives you its keys. `.items()` gives `(key, value)` pairs, which you unpack in the
`for` line, and `.values()` gives just the values.

```python
stock = {"MUG-01": 12, "TEE-02": 0, "CAP-03": 7}

for sku, count in stock.items():
    print(f"{sku}: {count}")
    if count == 0:
        print(f"  reorder {sku}")

sum(stock.values())
```

Dicts keep **insertion order**: keys come out in the order they were first added. Replacing a value
doesn't move its key; deleting a key and adding it again puts it at the end. (This has been
guaranteed since Python 3.7. Two dicts with the same pairs are still `==` whatever their order.)

`keys()`, `values()` and `items()` return **views**, not copies. A view is a live window onto the
dict, so it reflects later changes:

```python
stock = {"MUG-01": 12}
skus = stock.keys()
stock["TEE-02"] = 3

list(skus)
```

Because the loop is walking the live dict, adding or removing keys **during** the loop is an error.
Loop over `list(stock)` (a snapshot of the keys) if you need to delete as you go.

```python raises
stock = {"MUG-01": 12, "TEE-02": 0, "CAP-03": 0}
for sku in stock:
    if stock[sku] == 0:
        del stock[sku]
```

## Counting and grouping

Two patterns come up constantly. **Counting**: read the current count with a default of 0, add one,
store it back.

```python
statuses = ["paid", "shipped", "paid", "refunded", "paid"]

counts = {}
for status in statuses:
    counts[status] = counts.get(status, 0) + 1

counts
```

**Grouping**: collect items into a list per key. `setdefault(key, default)` returns the value for
`key`, first inserting `default` if the key is missing. Since it returns the list that's stored in
the dict, you can append to it directly:

```python
orders = [("ORD-1040", "ada"), ("ORD-1041", "grace"), ("ORD-1042", "ada")]

by_customer = {}
for order_id, customer in orders:
    by_customer.setdefault(customer, []).append(order_id)

by_customer
```

> [!NOTE]
> Both patterns are so common that the standard library has tools for them, `Counter` and
> `defaultdict`, which you'll meet in module 4. Knowing how to write them by hand makes those tools
> obvious when you get there.

```quiz
question: "After `d = {}` and `d.setdefault(\"ada\", []).append(1)` run twice, what is `d`?"
options:
  - "{'ada': [1]}"
  - "{'ada': [1, 1]}"
  - "{'ada': []}"
answer: 1
explain: "The first call inserts an empty list and returns it, and append adds 1. The second call finds the existing list and returns that same list, so the second append adds another 1."
```

## Merging with |

`a | b` builds a **new** dict with the keys of both. When a key is in both, the value from the right
wins. `a |= b` updates `a` in place, like `a.update(b)`.

```python
defaults = {"currency": "GBP", "tax_rate": 0.2, "shipping": 4.99}
customer = {"shipping": 0.0, "newsletter": False}

settings = defaults | customer

settings, defaults
```

The order follows the same rules as before: the left dict's keys first, in their order, then keys
that only the right dict has. A replaced value keeps its original position, which is why `shipping`
is still third. Layering like this (defaults, then per-customer overrides, then per-order ones) is a
very common way to build configuration.

> [!TIP]
> You'll also see `{**defaults, **customer}` in older code. It does the same thing as `|`; the
> operator was added in Python 3.9.

## Where this leaves you

A dict maps hashable keys to values, keeps insertion order, and hands out live views. `get` reads
with a default, `setdefault` inserts one, and `|` layers one dict over another. The drills have you
look up, count, group and merge.
