---
slug: loops
title: Loops with for and while
summary: for walks any collection directly; range, enumerate and zip cover the cases where you think you need an index.
minutes: 40
exercises:
  - loops-number-lines
  - loops-predict-for-else
  - loops-drop-cancelled
  - loops-refactor-range-len
  - loops-sales-tally
---

Python has two loops. `for` runs a block once for each item in a collection, and `while` runs a block
for as long as a condition stays true. Most of what makes Python loops feel different from other
languages is what `for` *doesn't* have: no counter, no `i++`, no `i < length`. This lesson shows what
to use instead.

## for walks the items

`for name in collection:` binds `name` to each item in turn and runs the indented block. It works on
anything iterable: lists, tuples, strings, and (in the next lessons) dicts and sets.

```python
basket = [("Coffee beans", 2, 8.50), ("Oat milk", 3, 1.75), ("Filter papers", 1, 3.20)]

total = 0
for name, quantity, unit_price in basket:
    line_total = quantity * unit_price
    print(f"{name:<14} {line_total:>6.2f}")
    total += line_total

print(f"{'Total':<14} {total:>6.2f}")
```

Notice the unpacking right in the `for` line: each item is a tuple, and `name, quantity, unit_price`
takes it apart, exactly as in the previous lesson. This pattern, a variable set up before the loop
and updated inside it, is called an **accumulator**.

> [!JS]
> Coming from JavaScript: Python's `for x in items` is JavaScript's `for (const x of items)`. There is
> no `for…in` over indexes and no C-style `for (let i = 0; …)` loop.

## range for counting

When you really do need a sequence of numbers, `range` produces them lazily. Like slicing, the stop
value is **excluded**.

```python
list(range(5)), list(range(1, 6)), list(range(10, 0, -3))
```

```python
for attempt in range(1, 4):
    print(f"Attempt {attempt} of 3")
```

`range(5)` doesn't build a list of five numbers; it's a small object that produces them one at a time
as the loop asks. `range(1_000_000_000)` costs no more memory than `range(5)`.

## enumerate and zip instead of indexes

If you're coming from a C-style loop, you'll be tempted to write `for i in range(len(items))` and then
use `items[i]`. It works, but it's noisy and easy to get wrong. Python has a tool for each reason you
might want the index:

- **You want a position number as well as the item:** `enumerate(items)` gives `(index, item)` pairs.
  Pass `start=1` to count from 1.
- **You want to walk two lists side by side:** `zip(a, b)` gives `(a_item, b_item)` pairs.

```python
tasks = ["Back up database", "Rotate logs", "Renew certificate"]

for number, task in enumerate(tasks, start=1):
    print(f"{number}. {task}")
```

```python
products = ["Mug", "Tee", "Cap"]
stock = [12, 0, 7]

for product, count in zip(products, stock):
    print(f"{product}: {count}")
```

`zip` stops at the **shortest** input, silently. If the lists should always be the same length, pass
`strict=True` and a mismatch raises `ValueError` instead of dropping data:

```python raises
products = ["Mug", "Tee", "Cap"]
stock = [12, 0]

for product, count in zip(products, stock, strict=True):
    print(product, count)
```

## while for "until something happens"

Use `while` when you don't know in advance how many times to go round: until a balance is paid off,
until the input runs out, until a retry succeeds.

```python
balance = 500.0
month = 0

while balance > 0:
    month += 1
    balance = balance * 1.01 - 120

f"Paid off in {month} months"
```

The condition is checked **before** each pass, so a `while` loop might run zero times. If nothing in
the body ever makes the condition false, the loop never ends.

> [!WARNING]
> An infinite loop freezes the page until the run times out. If you write `while True:`, make sure
> there's a `break` that is certain to be reached.

## break, continue and else

- `break` leaves the loop immediately.
- `continue` skips the rest of this pass and goes on to the next item.
- `else` on a loop runs only if the loop finished **without** hitting `break`.

That last one is unusual, and it's exactly what a search needs: "look for it; if you never found it,
do this".

```python
orders = [("ORD-1040", "paid"), ("ORD-1041", "refunded"), ("ORD-1042", "paid")]

for order_id, status in orders:
    if status == "cancelled":
        print("First cancelled order:", order_id)
        break
else:
    print("No cancelled orders")
```

Change the second status to `"cancelled"` and run it again: the `break` fires and the `else` is
skipped. Without `for`-`else` you'd need a `found = False` flag set before the loop and checked after
it.

```python
readings = [21.5, -999, 22.0, 22.4, -999, 23.1]   # -999 means the sensor dropped out

valid = 0
for reading in readings:
    if reading == -999:
        continue
    valid += 1

valid
```

```quiz
question: When does the else block of a for loop run?
options:
  - "When the loop body raises an error"
  - "When the loop ends without a break"
  - "Only when the collection is empty"
answer: 1
explain: "else runs whenever the loop runs out of items normally, including when there were no items at all. A break skips it."
```

## Don't change a list while you loop over it

Here's a bug that looks correct. We want to remove every out-of-stock product:

```python
products = [("Mug", 12), ("Tee", 0), ("Cap", 0), ("Scarf", 5)]

for product in products:
    if product[1] == 0:
        products.remove(product)

products
```

The cap survived. Under the hood, the `for` loop keeps a position counter into the list. When "Tee"
at position 1 is removed, everything after it shifts left, so "Cap" moves into position 1. The loop
then moves on to position 2, which is now "Scarf", and never looks at "Cap" at all.

The fix is to not mutate what you're looping over. Build a new list of the items you want to keep
(or loop over a copy, `for product in products[:]`, if you really must change the original):

```python
products = [("Mug", 12), ("Tee", 0), ("Cap", 0), ("Scarf", 5)]

in_stock = []
for name, count in products:
    if count > 0:
        in_stock.append((name, count))

in_stock
```

You'll see a one-line way to write that loop in the comprehensions lesson.

## Where this leaves you

`for` walks items directly, `enumerate` and `zip` replace index arithmetic, `range` counts, and
`while` loops until a condition changes. `break`, `continue` and `for`-`else` shape the flow, and a
loop should never change the list it's walking. The drills cover each of these, ending with a small
program that reads input until it's told to stop.
