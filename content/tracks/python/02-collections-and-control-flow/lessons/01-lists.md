---
slug: lists
title: Lists, slicing and sorting
summary: Lists are ordered and mutable. Knowing which operations change a list and which build a new one prevents a whole family of bugs.
minutes: 35
exercises:
  - lists-latest-three
  - lists-predict-sort
  - lists-top-three-prices
  - lists-rotate-left
---

A list is the collection you'll use most: an ordered sequence of any objects, which can grow, shrink
and change in place. That last part is where the bugs live. Some list operations change the list you
have; others hand you a brand-new list and leave the original alone. This lesson is mostly about
telling them apart.

## Making and reading a list

Square brackets make a list. Items can be any objects, including other lists, and they keep the
order you put them in. Indexes start at 0, and negative indexes count back from the end.

```python
orders = ["ORD-1040", "ORD-1041", "ORD-1042", "ORD-1043"]

first = orders[0]
last = orders[-1]
count = len(orders)
has_1042 = "ORD-1042" in orders

first, last, count, has_1042
```

`in` scans the list from the start and stops at the first equal item, so it answers "is this in
here?" without you writing a loop. Reading past the end is an error, not a quiet `undefined`:

```python raises
orders = ["ORD-1040", "ORD-1041"]
orders[2]
```

> [!JS]
> Coming from JavaScript: a list is like an array, but `orders[-1]` really is the last item, and an
> index that's out of range raises `IndexError` instead of returning `undefined`.

## Methods that change the list

These methods **mutate** the list in place. Every name that points at the list sees the change
(that's the rebinding-vs-mutating idea from module 1), and they all return `None`, except `pop`,
which returns the item it removed.

| Method | Does |
|--------|------|
| `append(x)` | adds one item at the end |
| `extend(items)` | adds every item from another collection at the end |
| `insert(i, x)` | puts `x` at index `i`, shifting the rest right |
| `pop()` / `pop(i)` | removes and returns the last item (or the one at `i`) |
| `remove(x)` | removes the first item equal to `x` (`ValueError` if there isn't one) |
| `clear()` | removes everything |

```python
queue = ["ORD-1040", "ORD-1041"]
queue.append("ORD-1042")
queue.insert(0, "ORD-1039")      # a rush order jumps the queue
shipped = queue.pop(0)           # take the first one off

shipped, queue
```

Watch the difference between `append` and `extend`. `append` adds its argument as **one** item, even
if that argument is a list:

```python
monday = ["apples", "pears"]
monday.append(["milk", "eggs"])
tuesday = ["apples", "pears"]
tuesday.extend(["milk", "eggs"])

monday, tuesday
```

```quiz
question: "What is `basket` after `basket = [1, 2]` and `basket = basket.append(3)`?"
options:
  - "[1, 2, 3]"
  - "[1, 2]"
  - "None"
answer: 2
explain: "append changes the list and returns None. The assignment then rebinds basket to that None, so the list is lost. Call basket.append(3) on its own line."
```

## Operations that build a new list

`+`, `*` and slicing never touch the original. They build a new list, which you then name or return.

```python
week_one = ["ORD-1040", "ORD-1041"]
week_two = ["ORD-1050"]

combined = week_one + week_two
placeholders = ["-"] * 3

combined, placeholders, week_one
```

`week_one` is unchanged. This is the rule of thumb for the whole module: **methods that mutate return
`None`**, so that you can't accidentally use them as if they gave you a new value. When a function
you write should leave its input alone, build a new list with one of these operations instead.

> [!WARNING]
> `list * n` repeats **references**, not copies. `[[]] * 3` is a list holding the same inner list
> three times, so appending to one "row" appends to all of them. You'll see the fix with
> comprehensions later in this module.

## Slicing

A slice `items[start:stop]` is a new list from index `start` up to, **but not including**, `stop`.
Leave out `start` to begin at the front, and leave out `stop` to run to the end. A third number is
the step.

```python
log = ["09:00 start", "09:05 login", "09:07 upload", "09:12 logout", "09:15 stop"]

log[1:3]      # items 1 and 2
```

```python
log = ["09:00 start", "09:05 login", "09:07 upload", "09:12 logout", "09:15 stop"]

first_two = log[:2]
last_two = log[-2:]
every_other = log[::2]
newest_first = log[::-1]

first_two, last_two, every_other, newest_first
```

Two properties make slicing pleasant to use:

- **Slices never raise for being out of range.** `log[:100]` on a five-item list just gives you all
  five, and `log[10:]` gives you `[]`. Indexing (`log[10]`) raises; slicing clips.
- **`items[:]` is a quick copy.** It's a new list with the same items, so it's the same as
  `list(items)` or `items.copy()`.

```python
original = ["ORD-1040", "ORD-1041"]
copy = original[:]
copy.append("ORD-1042")

original, copy, copy is original
```

The copy is **shallow**: a new outer list whose items are the same objects. If the items are
themselves lists, both copies share them.

## sort() vs sorted()

Python gives you two ways to sort, and they follow the rule above exactly:

- `items.sort()` sorts the list **in place** and returns `None`.
- `sorted(items)` returns a **new** sorted list and leaves `items` alone. It works on any
  collection, not only lists: a tuple, a string, a set.

```python
prices = [12.5, 3.99, 7.25, 3.5]

cheapest_first = sorted(prices)

cheapest_first, prices
```

```python
prices = [12.5, 3.99, 7.25, 3.5]
result = prices.sort()

result, prices
```

Why does `sort()` return `None` rather than the list? So a line like `top = prices.sort()` fails loudly
the first time you use `top`, instead of silently giving you a second name for a list you just
reordered. If you need the original order later, use `sorted()`.

Both take the same two options. `reverse=True` sorts largest first. `key=` names a function that is
called on every item, and the items are ordered by what it returns. You'll write your own key
functions in module 3; built-in ones already work:

```python
skus = ["mug-large", "Tee", "cap", "Hoodie"]

by_default = sorted(skus)                    # capitals sort before lower case
ignoring_case = sorted(skus, key=str.lower)
by_length = sorted(skus, key=len, reverse=True)

by_default, ignoring_case, by_length
```

Sorting compares items with `<`, so they have to be comparable with each other. Numbers mix fine
(`3 < 3.5`), but numbers and strings don't:

```python raises
sorted([12, "7", 3])
```

> [!TIP]
> Python's sort is **stable**: items that compare equal keep their original order. That lets you
> sort by one thing, then by another, and rely on the first order surviving within ties.

## Where this leaves you

You can read a list by index and slice, change it with methods that return `None`, and build new
lists with `+`, slicing and `sorted()`. When you write a function that takes a list, decide up front
whether it should change the caller's list or return a new one, and pick your operations to match.
The drills practise exactly that decision.
