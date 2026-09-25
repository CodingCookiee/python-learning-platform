---
slug: comprehensions
title: Comprehensions
summary: Build a list, dict or set from another collection in one expression, and know when a plain loop reads better.
minutes: 35
exercises:
  - comp-line-totals
  - comp-refactor-restock
  - comp-predict-nested
  - comp-email-index
  - comp-tag-cloud
---

You've written this loop several times already in this module: start with an empty list, loop, maybe
check a condition, append. It's so common that Python has a dedicated syntax for it, the
**comprehension**. It's shorter, it's usually faster, and once you can read it, it says what the code
does more directly than the loop does.

## From loop to comprehension

Here's the accumulator loop, then the same thing as a list comprehension:

```python
prices = [9.50, 18.00, 12.00]

with_vat = []
for price in prices:
    with_vat.append(round(price * 1.2, 2))

with_vat
```

```python
prices = [9.50, 18.00, 12.00]

with_vat = [round(price * 1.2, 2) for price in prices]
with_vat
```

Read it left to right as "the rounded price times 1.2, **for** each price **in** prices". The
expression at the front is what goes into the new list; the `for` part is the loop. Unpacking works
exactly as in a `for` statement:

```python
basket = [("Coffee beans", 2, 8.50), ("Oat milk", 3, 1.75)]

[f"{quantity} x {name}" for name, quantity, unit_price in basket]
```

> [!JS]
> Coming from JavaScript: `[p * 1.2 for p in prices]` is `prices.map(p => p * 1.2)`, and an `if`
> at the end (next section) does the job of `.filter()`. One comprehension can do both at once.

## Filtering and choosing

Add `if condition` at the end to keep only some items:

```python
stock = [("MUG-01", 12), ("TEE-02", 0), ("CAP-03", 3), ("SCARF-04", 0)]

sold_out = [sku for sku, count in stock if count == 0]
sold_out
```

That's different from choosing between two values for **every** item. For that, use the
**conditional expression** from module 1, `value_if_true if condition else value_if_false`. It goes
at the front, because it's part of the value being built:

```python
stock = [("MUG-01", 12), ("TEE-02", 0), ("CAP-03", 3)]

labels = [f"{sku}: sold out" if count == 0 else f"{sku}: {count} left" for sku, count in stock]
labels
```

So: `if` at the end **filters** (fewer items out than in); `if … else` at the front **transforms**
(one item out for every item in).

```quiz
question: "How many items does `[n for n in range(10) if n > 6]` have?"
options:
  - "10"
  - "3"
  - "7"
answer: 1
explain: "The if at the end filters: only 7, 8 and 9 pass the condition, so the new list has three items."
```

## Dict and set comprehensions

The same syntax in curly braces builds a set, and with `key: value` at the front it builds a dict.

```python
orders = [("ORD-1040", "ada", 59.90), ("ORD-1041", "grace", 12.50), ("ORD-1042", "ada", 7.25)]

totals_by_id = {order_id: total for order_id, customer, total in orders}
customers = {customer for order_id, customer, total in orders}

totals_by_id, sorted(customers)
```

A dict comprehension is the natural way to transform or filter a dict, for example to invert one or
to apply a discount to every price:

```python
prices = {"MUG-01": 9.50, "TEE-02": 18.00, "CAP-03": 12.00}

sale = {sku: round(price * 0.8, 2) for sku, price in prices.items() if price >= 10}
sale
```

## Nested comprehensions

A comprehension can have several `for` clauses. They run in the **same order** as nested `for`
statements would, outer first. This flattens a list of lists:

```python
shipments = [["MUG-01", "TEE-02"], ["CAP-03"], ["MUG-01", "SCARF-04"]]

every_item = [sku for shipment in shipments for sku in shipment]
every_item
```

If that order looks backwards, write out the loops it stands for, and the clauses are in the same
order, top to bottom:

```python norun
for shipment in shipments:
    for sku in shipment:
        every_item.append(sku)
```

A comprehension **inside** another one's expression builds a list of lists instead. This is also the
fix for the `[[]] * 3` trap from the lists lesson, because the inner list is built afresh each time:

```python
shelves = [[] for _ in range(3)]
shelves[0].append("MUG-01")

shelves
```

## When not to use one

A comprehension is for **building a collection**. Reach for a plain `for` loop instead when:

- **You're doing something rather than building something.** `[print(line) for line in lines]` builds
  a list of `None`s nobody wants. Use a loop.
- **You need `break`, `try`, or several statements per item.** Comprehensions only hold expressions.
- **It no longer fits in your head.** Two `for` clauses and a condition is about the limit. Past that,
  a loop with named intermediate values is easier to read and to debug.

```python
# Too clever: what does this do?
matrix = [[1, 2, 3], [4, 5, 6]]
flipped = [[row[i] for row in matrix] for i in range(len(matrix[0]))]

flipped
```

That one line transposes a matrix, and it's correct, but nobody can see that at a glance. A comment
or a loop would be kinder to the next reader.

> [!TIP]
> When you only need to add up, or check, the items, skip the square brackets:
> `sum(total for _, _, total in orders)` or `any(count == 0 for _, count in stock)`. That's a
> **generator expression**, which produces items one at a time without building a list. Module 8
> explains how it works.

## Where this leaves you

`[expr for x in items if cond]` replaces the build-a-list loop, `{k: v for …}` and `{x for …}` build
dicts and sets, and `a if cond else b` at the front chooses a value per item. Keep them short, and use a loop when
you're doing rather than building. The drills include one refactor from a loop and one nested
comprehension.
