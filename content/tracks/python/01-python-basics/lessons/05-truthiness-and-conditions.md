---
slug: truthiness-and-conditions
title: Truthiness and conditions
summary: Any object can be a condition, and and/or return values rather than True or False.
minutes: 30
exercises:
  - truthiness-predict-operands
  - truthiness-display-name
  - truthiness-default-quantity
  - truthiness-shipping-cost
  - truthiness-coupon-discount
---

Python lets you write `if cart:` instead of `if len(cart) > 0:`, and `name or "Guest"` instead of a
four-line `if`. Both are idiomatic, both are everywhere in real code, and both rest on one rule about
which values count as false. This lesson covers that rule, the conditions built on it, and the one
trap it sets that catches experienced developers.

## True, False and bool

Comparisons produce one of two values, `True` or `False`, of type `bool`. They're written with
capitals, and they're really the ints `1` and `0` wearing a different name, which is why you can add
them up:

```python
paid = 45.00 >= 45.00
shipped = "2026-09-25" < "2026-09-01"
paid, shipped, type(paid), True + True + False
```

Strings compare character by character, so dates written as `YYYY-MM-DD` sort correctly as text.
`==` and `!=` compare values, as lesson 2 showed, and never convert between types: `"1" == 1` is
simply `False`.

> [!JS]
> Coming from JavaScript: there's no `===`, because Python's `==` never coerces. `"1" == 1` is
> `False`, and `0 == ""` is `False` too.

## What counts as false

When Python needs a yes or no, in an `if`, a `while`, or with `and`, `or` and `not`, it accepts any
object and asks the object whether it's "truthy". The rule is short. These are **falsy**:

- `False` and `None`
- zero of any number type: `0`, `0.0`, `Decimal("0")`
- empty collections: `""`, `[]`, `()`, `{}`, `set()`

Everything else is truthy. `bool(value)` shows you which way a value goes:

```python
bool(0), bool(""), bool([]), bool(None), bool(0.0)
```

```python
bool("0"), bool("False"), bool(" "), bool([0]), bool(-1)
```

The second row is all `True`. `"0"` and `"False"` are non-empty strings, `" "` contains a space, and
`[0]` is a list with one item in it. The rule is about emptiness and zero, never about what the text
says.

> [!JS]
> Coming from JavaScript: the rules are close, but an empty list `[]` and an empty dict `{}` are
> falsy in Python, while `[]` and `{}` are truthy in JS.

## if, elif and else

`if` runs its block when the condition is truthy. `elif` ("else if") is checked only when everything
above it was false, and `else` catches whatever is left. Python checks the branches top to bottom and
runs **only the first** that matches.

That makes the order of the branches part of the logic. Here's a common mistake, a discount table
checked smallest first:

```python
order_total = 250

if order_total >= 50:
    discount = 5
elif order_total >= 100:
    discount = 10
elif order_total >= 200:
    discount = 20
else:
    discount = 0
discount
```

A 250 order gets only 5% off: `>= 50` matches first, and the other branches are never looked at.
Check the most specific condition first:

```python
order_total = 250

if order_total >= 200:
    discount = 20
elif order_total >= 100:
    discount = 10
elif order_total >= 50:
    discount = 5
else:
    discount = 0
discount
```

Change `order_total` to `120`, `60` and `20`, and run it each time.

## Comparisons chain

`0 < weight <= 5` means exactly what it means in maths: `0 < weight and weight <= 5`. Python chains
comparison operators, evaluating the middle value once, so range checks read naturally.

```python
weight_kg = 3.2
0 < weight_kg <= 5, 5 < weight_kg <= 20
```

The trap here is the opposite one. Plain English says "if the status is paid or shipped", but this
code doesn't mean that:

```python
status = "cancelled"

if status == "paid" or "shipped":
    print("Ready to fulfil")
```

It prints, for a cancelled order. Python reads it as `(status == "paid") or "shipped"`, and
`"shipped"` is a non-empty string, so it's always truthy. Compare each value, or ask whether the
status is `in` a tuple of options:

```python
status = "cancelled"
status == "paid" or status == "shipped", status in ("paid", "shipped")
```

## and and or return one of their operands

`and` and `or` don't return `True` or `False`. They return one of the two values you gave them, and
they stop as soon as they know the answer (they **short-circuit**):

- `a or b` gives `a` if `a` is truthy, and otherwise `b`.
- `a and b` gives `a` if `a` is falsy, and otherwise `b`.

```python
"Ada" or "Guest", "" or "Guest", "Ada" and "shipped", "" and "shipped"
```

That's what powers the **default value idiom**: `name or "Guest"` is the name if there is one, and
`"Guest"` if the name is empty or `None`.

```python
customer_name = ""
greeting = f"Hello, {customer_name or 'Guest'}!"
greeting
```

> [!WARNING]
> `or` can't tell "missing" from "falsy". If a customer orders a quantity of `0` to remove an item,
> `quantity or 1` quietly turns it into 1, because 0 is falsy. Use `or` for defaults only when every
> falsy value really means "not given". When 0, `""` or `False` are real answers, test for `None`
> explicitly (next section).

```python
quantity = 0
quantity or 1
```

`not` is the odd one out: it always returns a `bool`. `not ""` is `True`, and `not "Ada"` is `False`.

> [!JS]
> Coming from JavaScript: `or` is `||` and `and` is `&&`, with the same operand-returning behaviour.
> Python has no `??`, so write `x if x is not None else default` when zero must survive.

```quiz
question: What does `0 or "" or None` evaluate to?
options:
  - "0"
  - "False"
  - "None"
answer: 2
explain: "or moves on past each falsy value. When every operand is falsy, it returns the last one, which here is None."
```

## None, and why you test it with is

`None` is Python's value for "nothing here": a field that wasn't filled in, a search that found no
match, a function that didn't return anything. There is exactly one `None` object in a running
program, so the right test is identity, with `is`:

```python
coupon = None
coupon is None, coupon is not None
```

`== None` usually works too, but it asks the object whether it considers itself equal to `None`, and
an object is allowed to answer however it likes. `is None` can't be fooled, and it's the style every
Python linter enforces.

`None` is falsy, but so are `0` and `""`, and that's exactly the difference the warning above is
about. `if not quantity:` is true for `None` and for `0`; `if quantity is None:` is true for `None`
only.

```python
quantity = 0
not quantity, quantity is None
```

## Conditional expressions

When an `if`/`else` only chooses between two values, write it as one expression:
`value_if_true if condition else value_if_false`.

```python
order_total = 42.50
shipping = 0 if order_total >= 50 else 4.99
label = "Free shipping" if shipping == 0 else f"Shipping: {shipping:.2f}"
label
```

It reads in English order: "zero if the order is big enough, otherwise 4.99". And it's the tool that
fixes the `or` trap: `1 if quantity is None else quantity` keeps a real 0.

> [!JS]
> Coming from JavaScript: this is the ternary `cond ? a : b`, with the condition in the middle.

## Where this leaves you

Zero, empty and `None` are falsy; everything else is truthy. `if`/`elif` runs the first matching
branch, so order the branches from most to least specific. `and` and `or` return operands, which
makes `name or "Guest"` work and `quantity or 1` a bug. Test for `None` with `is`. The drills put each
rule to work on names, quantities, shipping bands and coupons.
