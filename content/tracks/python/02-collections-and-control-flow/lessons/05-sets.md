---
slug: sets
title: Sets for membership and uniqueness
summary: A set holds each value once and answers "is it in here?" instantly, and set operators compare whole groups in one step.
minutes: 25
exercises:
  - sets-unique-tags
  - sets-predict-operations
  - sets-customer-changes
  - sets-dedupe-emails
---

A **set** is an unordered collection of unique values. It's what you want when the question is
"which ones?" rather than "in what order?" or "how many of each?": which customers ordered this
month, which SKUs are discontinued, which tags a post has. Sets are built on the same hashing as dict
keys, so the same rules and the same speed apply.

## Making a set

Curly braces with values (no colons) make a set, and `set(collection)` builds one from anything you
can loop over. Duplicates disappear.

```python
tags = {"python", "tutorial", "python", "beginner"}
from_list = set(["mug", "tee", "mug", "cap", "tee"])

tags, len(tags), from_list
```

A set has **no order** and no indexes: `tags[0]` is an error, and the order a set prints in isn't
something to rely on. If you need a stable order, sort it: `sorted(tags)` returns a list.

```quiz
question: "What is `type({})`?"
options:
  - "set"
  - "dict"
  - "tuple"
answer: 1
explain: "Empty braces have always meant an empty dict, since dicts came first. An empty set is written set()."
```

## Fast membership

`x in some_list` checks the items one by one, so it gets slower as the list grows. `x in some_set`
hashes `x` and jumps straight to where it would be, so it takes about the same time for ten items or
ten million. When you'll check membership many times, build a set once and check against that.

```python
discontinued = {"TEE-02", "CAP-03", "HAT-09"}
basket = ["MUG-01", "CAP-03", "SCARF-04"]

for sku in basket:
    if sku in discontinued:
        print(f"{sku} is no longer sold")
```

Adding and removing items mutates the set. `remove(x)` raises `KeyError` if `x` is missing, while
`discard(x)` quietly does nothing:

```python
discontinued = {"TEE-02", "CAP-03"}
discontinued.add("HAT-09")
discontinued.discard("SCARF-04")    # not there: no error

sorted(discontinued)
```

```python raises
discontinued = {"TEE-02", "CAP-03"}
discontinued.remove("SCARF-04")
```

## Comparing groups

Sets support the operations you'd draw as a Venn diagram, as operators. Each returns a **new** set.

| Operator | Method | Gives you |
|----------|--------|-----------|
| `a \| b` | `a.union(b)` | everything in either |
| `a & b` | `a.intersection(b)` | only what's in both |
| `a - b` | `a.difference(b)` | what's in `a` but not `b` |
| `a ^ b` | `a.symmetric_difference(b)` | what's in exactly one of them |

```python
august = {"ada", "grace", "linus", "margaret"}
september = {"grace", "linus", "ken", "barbara"}

returning = august & september
new = september - august
lapsed = august - september

sorted(returning), sorted(new), sorted(lapsed)
```

The methods accept any collection, not only sets (`august.union(["ken"])`), while the operators need a
set on both sides. `<=` asks "is every item of the left also in the right?", which is handy for
checking permissions:

```python
required = {"orders:read", "orders:write"}
granted = {"orders:read", "orders:write", "customers:read"}

required <= granted, required - granted
```

> [!JS]
> Coming from JavaScript: a `Set` there compares objects by identity, so two equal arrays are two
> members. Python compares by value, which is why only hashable values like strings, numbers and
> tuples can go in a set.

## Only hashable values

Everything in a set must be hashable, for the same reason dict keys must be: its hash decides where
it's stored. Tuples are fine; lists and dicts aren't.

```python raises
seen_routes = {["home", "pricing"], ["home", "signup"]}
```

```python
seen_routes = {("home", "pricing"), ("home", "signup"), ("home", "pricing")}
len(seen_routes)
```

There's also `frozenset`, an immutable set, which can itself go inside a set or be a dict key. You
won't need it often.

## Removing duplicates but keeping order

`set(items)` removes duplicates but loses the original order. When order matters, keep a set of what
you've already seen alongside a list of results:

```python
signups = ["ada@example.com", "grace@example.com", "ada@example.com", "ken@example.com"]

seen = set()
unique = []
for email in signups:
    if email not in seen:
        seen.add(email)
        unique.append(email)

unique
```

The set answers "have I seen this?" instantly; the list remembers the order. (A shortcut you'll see
in the wild is `list(dict.fromkeys(signups))`, which uses the fact that dict keys are unique and
ordered.)

## Where this leaves you

Sets hold unique, hashable values with no order. They make membership checks fast and let you compare
whole groups with `|`, `&`, `-` and `^`. The drills use each of those, and finish with an
order-keeping de-duplication.
