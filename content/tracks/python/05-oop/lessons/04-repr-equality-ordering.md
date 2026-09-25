---
slug: repr-equality-ordering
title: Printing, comparing and sorting objects
summary: The dunder methods that give an object a readable repr, value equality, a correct hash and a full ordering.
minutes: 35
exercises:
  - oop-product-repr
  - oop-predict-repr-or-str
  - oop-money-equality-fix
  - oop-version-ordering
---

Out of the box, your objects are awkward to work with. They print as a memory address, two
products with the same SKU aren't equal, and a list of them can't be sorted:

```python
class Product:
    def __init__(self, sku, name):
        self.sku = sku
        self.name = name

mug = Product("MUG-01", "Coffee mug")
same_mug = Product("MUG-01", "Coffee mug")
mug, mug == same_mug
```

Python lets a class define what printing, `==` and `<` mean by writing special methods, the
**dunders** (double-underscore methods). You've already written one, `__init__`. This lesson covers
the four you'll write most.

## `__repr__`: the developer's view

`__repr__` returns the text Python shows whenever it displays an object for a developer: in the
REPL, inside a list, in a traceback, with `repr(x)` and with `{x!r}` in an f-string. The convention
is to make it look like the call that would recreate the object:

```python
class Product:
    def __init__(self, sku, name):
        self.sku = sku
        self.name = name

    def __repr__(self):
        return f"Product({self.sku!r}, {self.name!r})"

mug = Product("MUG-01", "Coffee mug")
mug, [mug, Product("LAMP-02", "Desk lamp")]
```

`!r` inserts each field's own repr, so strings keep their quotes and the output is valid Python.
Write a `__repr__` for every class you create; it's the single cheapest debugging aid there is.

## `__str__`: the user's view

`__str__` is for people who aren't developers: `print(x)`, `str(x)` and plain `{x}` in an
f-string use it. If a class has no `__str__`, those fall back to `__repr__`.

```python
class Product:
    def __init__(self, sku, name):
        self.sku = sku
        self.name = name

    def __repr__(self):
        return f"Product({self.sku!r}, {self.name!r})"

    def __str__(self):
        return f"{self.name} ({self.sku})"

mug = Product("MUG-01", "Coffee mug")
print(mug)
print([mug])
f"{mug} / {mug!r}"
```

Notice `print([mug])`: a list prints its items with `repr`, even inside `print`. Containers are for
developers.

```quiz
question: A class defines only `__repr__`. What does `print(obj)` show?
options:
  - "The default <... object at 0x...> text"
  - "The __repr__ text"
  - "Nothing: it raises an error"
answer: 1
explain: When __str__ is missing, str() and print() fall back to __repr__. The reverse isn't true, which is why __repr__ is the one to write first.
```

## `__eq__`: value equality

By default, `==` on your objects compares **identity**, exactly like `is`. To compare values,
define `__eq__(self, other)`:

```python
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return (self.amount, self.currency) == (other.amount, other.currency)

Money(5, "EUR") == Money(5, "EUR"), Money(5, "EUR") == Money(5, "USD"), Money(5, "EUR") == 5
```

Comparing tuples of the fields is the tidy way to compare several at once. `return NotImplemented`
(a special built-in value, not an exception) says "I don't know how to compare with that". Python
then tries the other object's `__eq__`, and if neither knows, falls back to identity, so `Money(5,
"EUR") == 5` is simply `False` instead of crashing on `other.amount`.

> [!JS]
> Coming from JavaScript: there's no way to customise `===`, so objects are always compared by
> reference. In Python, `==` calls `__eq__`, and `is` is the reference check.

## What `__eq__` does to `__hash__`

Sets and dict keys find things by **hash**, a number computed from the value. The rule is that
equal objects must have equal hashes. Python can't know how your `__eq__` relates to hashing, so
when a class defines `__eq__`, Python sets its `__hash__` to `None`, and instances become unhashable:

```python raises
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return (self.amount, self.currency) == (other.amount, other.currency)

{Money(5, "EUR"), Money(5, "EUR")}
```

If the object's value won't change, define `__hash__` by hashing a tuple of **the same fields
`__eq__` compares**:

```python
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return (self.amount, self.currency) == (other.amount, other.currency)

    def __hash__(self):
        return hash((self.amount, self.currency))

prices = {Money(5, "EUR"), Money(5, "EUR"), Money(7, "EUR")}
len(prices)
```

> [!WARNING]
> Only make an object hashable if the fields in its hash never change. Mutate one after the object
> is in a set or used as a dict key, and it's filed under the wrong hash and can't be found again.
> A mutable object with `__eq__` should stay unhashable.

## Ordering and `total_ordering`

`sorted()`, `min()`, `max()` and `<` all use `__lt__` ("less than"). Define it the same way as
`__eq__`, comparing tuples in priority order:

```python
class Version:
    def __init__(self, major, minor):
        self.major = major
        self.minor = minor

    def __repr__(self):
        return f"Version({self.major}, {self.minor})"

    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor) < (other.major, other.minor)

sorted([Version(1, 10), Version(1, 2), Version(0, 9)])
```

That's enough for sorting, but `<=`, `>` and `>=` would still fail. Rather than writing four
methods, decorate the class with `functools.total_ordering`: give it `__eq__` and `__lt__`, and it
fills in the other three.

```python
from functools import total_ordering

@total_ordering
class Version:
    def __init__(self, major, minor):
        self.major = major
        self.minor = minor

    def _key(self):
        return (self.major, self.minor)

    def __eq__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self._key() == other._key()

    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self._key() < other._key()

Version(1, 2) >= Version(1, 2), Version(2, 0) > Version(1, 10), Version(1, 2) <= Version(1, 1)
```

A private `_key()` method keeps `__eq__`, `__lt__` (and `__hash__`, if you add one) comparing the
same fields, so they can never disagree.

> [!TIP]
> These are the everyday dunders. The rest of Python's data model, `__len__`, `__getitem__`,
> `__contains__`, `__call__` and friends, is module 11. Dataclasses (lesson 6) can write
> `__repr__`, `__eq__`, `__hash__` and ordering for you, and they follow exactly these rules.

## Where this leaves you

`__repr__` is for developers and is the one to write first; `__str__` is for users and falls back
to `__repr__`. `__eq__` gives value equality, returns `NotImplemented` for foreign types, and
switches hashing off until you define a matching `__hash__`. `__lt__` plus `total_ordering` gives a
full ordering. The drills make you write, predict and repair each one.
