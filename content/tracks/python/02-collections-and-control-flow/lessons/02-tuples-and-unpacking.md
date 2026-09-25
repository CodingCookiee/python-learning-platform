---
slug: tuples-and-unpacking
title: Tuples and unpacking
summary: Tuples are fixed records, and unpacking pulls them apart into named pieces in one line.
minutes: 30
exercises:
  - tuples-price-range
  - tuples-predict-starred
  - tuples-parse-log-line
  - tuples-shipping-label
---

A list is for "some number of the same kind of thing": the orders today, the prices in a basket. A
**tuple** is for "exactly these pieces, in this order": one order's ID, customer and total. Tuples
can't change, and Python lets you unpack them straight into names, which is one of the language's
most-used features.

## Tuples are fixed records

A tuple is written with commas, usually inside parentheses. You read it by index and slice it
exactly like a list, but you can't change it: there's no `append`, and item assignment raises.

```python
order = ("ORD-1042", "Ada Lovelace", 59.90)

order_id = order[0]
total = order[-1]

order_id, total, len(order)
```

```python raises
order = ("ORD-1042", "Ada Lovelace", 59.90)
order[2] = 64.90
```

It's the **comma** that makes a tuple, not the parentheses. The parentheses are only there for
grouping, which leads to one odd-looking case: a tuple with one item needs a trailing comma.

```python
pair = 3, 4               # no parentheses needed
not_a_tuple = ("ORD-1042")
one_item = ("ORD-1042",)
empty = ()

type(pair), type(not_a_tuple), type(one_item), len(empty)
```

Why have an immutable list at all? Because "can't change" is a promise. A function that receives a
tuple knows nobody can add a fourth field behind its back, and, as you'll see with dicts and sets,
only unchangeable values can be used as dict keys or set members.

```quiz
question: "What is `type((42))`?"
options:
  - "tuple"
  - "int"
  - "list"
answer: 1
explain: "Parentheses alone just group an expression, so (42) is the int 42. The one-item tuple is (42,), with a trailing comma."
```

## Unpacking into names

Put several names on the left of `=` and Python unpacks the right-hand side into them, in order.
This works for any sequence: a tuple, a list, even a string.

```python
line_item = ("Coffee beans", 2, 8.50)
name, quantity, unit_price = line_item

name, quantity * unit_price
```

The number of names has to match the number of items exactly. Python won't quietly fill in `None`
or drop extras:

```python raises
name, quantity = ("Coffee beans", 2, 8.50)
```

> [!JS]
> Coming from JavaScript: this is array destructuring without the brackets. `const [a, b] = [1, 2, 3]`
> silently ignores the 3; Python raises `ValueError` instead.

Unpacking also works on nested structures, as long as the shape on the left matches the shape on the
right:

```python
shipment = ("ORD-1042", ("London", "N1 9GU"))
order_id, (city, postcode) = shipment

city, postcode
```

## Starred targets

When you only know the shape of part of the data, one name can be starred. It collects "everything
else" into a **list**, which may be empty.

```python
readings = [18.5, 19.0, 19.2, 20.1, 21.4]

first, *rest = readings
*earlier, latest = readings
opening, *middle, closing = readings

first, latest, middle
```

This is ideal for text split into words, where the first few words have fixed meanings and the rest
is free text:

```python
line = "2026-09-25 ERROR disk almost full on /var"
date, level, *words = line.split()

date, level, " ".join(words)
```

Only one name per level can be starred (two would be ambiguous), and `_` is the conventional name for
a value you don't need: `*_, latest = readings`.

## Swapping and simultaneous assignment

Python evaluates the whole right-hand side **before** assigning anything. The right side builds a
tuple of the current values, then the left side unpacks it. That's why a swap needs no temporary
variable:

```python
low, high = 90, 40
if low > high:
    low, high = high, low

low, high
```

The same trick updates several values that depend on each other. Here each step needs the old value
of `balance` for both lines, so assigning them one at a time would be wrong:

```python
balance, interest = 1000.0, 0.0
interest, balance = balance * 0.05, balance * 1.05

interest, balance
```

## Returning several values

A function that "returns two things" really returns one tuple, and the caller usually unpacks it
straight away. You met this with `swap()` in module 1.

```python
def min_and_max(scores):
    return min(scores), max(scores)

lowest, highest = min_and_max([72, 91, 64, 88])
lowest, highest
```

`min()` and `max()` work on any collection of comparable items, and `sum()` adds numbers, so you'll
often combine them with unpacking like this.

> [!WARNING]
> A tuple can't change, but the objects inside it can. `("ORD-1042", ["mug"])` holds a list, and
> `order[1].append("tee")` works fine. The tuple still points at the same list; it's the list that
> changed.

## Where this leaves you

Tuples are fixed-size records that can't change. Unpacking assigns their pieces to names, starred
targets collect the variable part, and the right-hand side is always evaluated first, which gives you
swaps for free. The drills have you return, unpack and restructure records.
