---
slug: names-and-objects
title: Names, objects and types
summary: A variable is a label on an object, which is why some changes show up in two places at once.
minutes: 30
exercises:
  - rebind-or-mutate
  - swap-two-values
  - type-report
  - safe-default-list
---

Here is a bug that surprises almost everyone the first time. Two variables, one change, and both of
them move:

```python
monday = ["write report", "call bank"]
tuesday = monday
tuesday.append("book dentist")
monday
```

Nothing was "copied" on line 2. By the end of this lesson you'll be able to predict that result and
explain it in one sentence.

## Names point at objects

Everything in Python is an **object**: a number, a string, a list, a function. An object has a
**type** (what it is), a **value** (what it holds) and an **identity** (which object it is, fixed for
its lifetime).

A variable is just a **name bound to an object**. `x = 5` means "make the name `x` refer to the
object `5`". It does not create a box called `x` with 5 stored inside.

```python
price = 19.99
label = "Coffee beans"
in_stock = True

type(price), type(label), type(in_stock)
```

`type()` tells you what kind of object a name currently points at. The name itself has no type: the
same name can point at a number now and a string later. That is what "dynamically typed" means.

```python
order_id = 1042
order_id = "ORD-1042"   # the same name, now bound to a str
type(order_id)
```

> [!JS]
> Coming from JavaScript: this is like `let`, but there's no declaration step. Assigning a name
> creates it; using a name that was never assigned raises `NameError`, because there is no `undefined`.

## Assignment never copies

`tuesday = monday` makes `tuesday` another name for **the same list object**. Appending through
either name changes that one object, so both names see it.

`id()` returns an object's identity (in CPython, its memory address), and `is` asks "are these the
same object?":

```python
monday = ["write report"]
tuesday = monday
backup = list(monday)    # a new list with the same items

tuesday is monday, backup is monday, backup == monday
```

- `==` compares **values**: do they contain equal things?
- `is` compares **identity**: are they literally the same object?

You want `==` almost always. The one everyday use of `is` is checking for `None` (next lessons).

```quiz
question: After `a = [1, 2]`, `b = a` and `b = [1, 2, 3]`, what is `a`?
options:
  - "[1, 2]"
  - "[1, 2, 3]"
answer: 0
explain: "`b = [1, 2, 3]` rebinds the name b to a brand-new list. It doesn't touch the object a points at. Only mutating the shared object (b.append(3)) would change a."
```

## Rebinding vs mutating

This is the whole trick, so it's worth being precise. There are two different things you can do:

| You write | What happens | Other names see it? |
|-----------|--------------|---------------------|
| `name = new_value` | **Rebind**: the name now points at a different object | No |
| `name.append(x)`, `name[0] = x`, `name += [x]` on a list | **Mutate**: the object itself changes | Yes, every name for that object |

```python
cart = ["apples"]
same_cart = cart

cart = cart + ["pears"]   # builds a NEW list and rebinds cart
same_cart                 # still the old list
```

## Mutable and immutable types

Some types can't be changed after they're created. They are **immutable**: `int`, `float`, `bool`,
`str`, `tuple`, `None`. Every "change" to them builds a new object, so sharing them is always safe.

Others are **mutable**: `list`, `dict`, `set`, and most objects you'll create yourself. Sharing those
means sharing changes.

```python
greeting = "hello"
shout = greeting.upper()   # strings never change in place; upper() returns a new str
greeting, shout
```

```python raises
code = "ORD-1042"
code[0] = "X"
```

Strings don't allow item assignment. To "change" one, build a new string: `"X" + code[1:]`.

## Several names at once

Python can assign several names in one statement. The right-hand side is evaluated completely first,
which is what makes the classic swap work without a temporary variable:

```python
first, second = "Ada", "Grace"
first, second = second, first
first, second
```

> [!TIP]
> Name things in `snake_case`: `order_total`, not `orderTotal`. Constants that never change are
> written in capitals by convention, `MAX_RETRIES = 3`, though Python doesn't enforce it.

## Where this leaves you

A name points at an object. Assignment rebinds a name; methods like `append` mutate the object. `==`
compares values, `is` compares identity. The drills make you predict and control both.
