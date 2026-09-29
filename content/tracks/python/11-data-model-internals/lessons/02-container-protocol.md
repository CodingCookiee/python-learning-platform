---
slug: container-protocol
title: Containers, truth and calls
summary: Implement the special methods behind len(), indexing, in, for, if and calling, and let collections.abc write the rest.
minutes: 40
exercises:
  - model-tax-rate-callable
  - model-order-lines
  - model-predict-protocol-fallbacks
  - model-stock-levels-fix
  - model-paged-results
---

An order holds lines, so it's natural to ask how many there are, take the first one, or check
whether a product is in it. Out of the box, a class you write supports none of that:

```python raises
class Order:
    def __init__(self, *lines):
        self._lines = list(lines)

order = Order(("MUG-01", 2), ("TEA-50", 1))
len(order)
```

`len()`, `[]`, `in`, `for`, `if` and calling with `()` aren't reserved for built-in types. Each one
calls a special method, and a class that defines it gets the syntax. This set of hooks is Python's
**data model**; this lesson covers the container part of it, plus truth and calls.

## Syntax calls special methods

Every piece of syntax below turns into a method call on the object's type:

| You write | Python calls |
|-----------|--------------|
| `len(order)` | `type(order).__len__(order)` |
| `order[0]`, `order[1:]` | `__getitem__(order, 0)`, `__getitem__(order, slice(1, None))` |
| `order[0] = line` | `__setitem__(order, 0, line)` |
| `"MUG-01" in order` | `__contains__(order, "MUG-01")` |
| `for line in order` | `__iter__(order)`, then `__next__` on what it returns |
| `if order:`, `bool(order)` | `__bool__(order)`, or `__len__(order) != 0` |
| `discount(price)` | `__call__(discount, price)` |

You met `__iter__` and `__next__` in module 8 and `__eq__` and `__hash__` in lesson 1. The rest are
here.

## A sequence: `__len__` and `__getitem__`

Define `__len__` and `__getitem__` and your class is already most of the way to behaving like a
list. `__getitem__` receives whatever was inside the brackets. For `order[1:]` that's a `slice`
object, so the method can tell the two apart:

```python
class Order:
    def __init__(self, *lines):
        self._lines = list(lines)

    def __repr__(self):
        return f"Order{tuple(self._lines)}"

    def __len__(self):
        return len(self._lines)

    def __getitem__(self, index):
        print("  __getitem__ got", repr(index))
        if isinstance(index, slice):
            return Order(*self._lines[index])     # slicing keeps the type
        return self._lines[index]

order = Order(("MUG-01", 2), ("TEA-50", 1), ("LAMP-02", 1))
len(order), order[0], order[-1], order[1:]
```

Negative indices work because the list inside does the indexing. Returning an `Order` for a slice,
rather than a bare list, is what users of the class will expect.

Something else just started working too. With no `__iter__` at all, Python falls back to calling
`__getitem__(0)`, `__getitem__(1)` and so on until it raises `IndexError`:

```python
class Order:
    def __init__(self, *lines):
        self._lines = list(lines)

    def __getitem__(self, index):
        return self._lines[index]

order = Order(("MUG-01", 2), ("TEA-50", 1))
[sku for sku, quantity in order], ("TEA-50", 1) in order
```

## `in` and `for`: `__contains__` and `__iter__`

That fallback is convenient for lists, and a trap for anything else. `in` tries three things in
order: `__contains__`; failing that, iterating with `__iter__` and comparing each item with `==`;
failing that, the `__getitem__(0), (1), ...` scan. So a lookup table keyed by SKU goes wrong in a
confusing way:

```python raises
class PriceList:
    def __init__(self, prices):
        self._prices = dict(prices)

    def __getitem__(self, sku):
        return self._prices[sku]

prices = PriceList({"MUG-01": 8.50, "TEA-50": 4.20})
print(prices["MUG-01"])
"MUG-01" in prices
```

`in` had no `__contains__`, so it called `prices[0]` and the dict raised `KeyError: 0`. Anything
keyed by something other than position needs its own `__contains__` and `__iter__`:

```python
class PriceList:
    def __init__(self, prices):
        self._prices = dict(prices)

    def __getitem__(self, sku):
        return self._prices[sku]

    def __contains__(self, sku):
        return sku in self._prices

    def __iter__(self):
        return iter(self._prices)      # like a dict: iterating gives the keys

prices = PriceList({"MUG-01": 8.50, "TEA-50": 4.20})
"MUG-01" in prices, "LAMP-02" in prices, sorted(prices)
```

`__contains__` is also the one to write for speed: the fallbacks scan every item, while a dict or
set lookup doesn't.

> [!JS]
> Coming from JavaScript: `__iter__` is `[Symbol.iterator]()`, and `__next__` is the iterator's
> `next()`. JS has no equivalent of `__getitem__` short of a `Proxy`.

## `__bool__`, and the fallback to `__len__`

`if order:` asks the object whether it's truthy. Python calls `__bool__` if the class has one;
otherwise it uses `__len__`, so a container with no items is falsy for free. A class with neither
is always truthy.

```python
class Order:
    def __init__(self, *lines):
        self._lines = list(lines)

    def __len__(self):
        return len(self._lines)

class Balance:
    def __init__(self, pence):
        self.pence = pence

    def __bool__(self):
        return self.pence != 0

class Customer:
    pass

bool(Order()), bool(Order(("MUG-01", 1))), bool(Balance(0)), bool(Balance(-250)), bool(Customer())
```

Define `__bool__` only when "empty" or "zero" has an obvious meaning. A `Customer` that was falsy
would make every `if customer:` check lie.

```quiz
question: "A class defines `__len__` returning 0 and `__bool__` returning True. What is `bool(obj)`?"
options:
  - "False, because it's empty"
  - "True"
  - "It raises TypeError"
answer: 1
explain: "__bool__ comes first. __len__ is only the fallback when a class has no __bool__."
```

## `__call__`: objects that act like functions

A class with `__call__` makes instances you can call. It's the right tool when a function needs
configuration, or needs to remember something between calls:

```python
class Discount:
    def __init__(self, percent):
        self.percent = percent
        self.applied = 0

    def __call__(self, price):
        self.applied += 1
        return round(price * (100 - self.percent) / 100, 2)

spring_sale = Discount(20)
prices = [12.50, 40.00, 7.99]

list(map(spring_sale, prices)), spring_sale.applied, callable(spring_sale), callable(prices)
```

Anything that accepts a function (`map`, `sorted(key=...)`, a callback) accepts a callable object.
A closure (module 3) can do the same job; a class is clearer when there are several settings or
when other code needs to read the state, like `applied` here.

## Looked up on the type, not the instance

Python finds special methods on the object's **type**, never on the instance itself. Attaching one
to an instance does nothing for the syntax:

```python
class Order:
    def __init__(self, *lines):
        self._lines = list(lines)

    def __len__(self):
        return len(self._lines)

order = Order(("MUG-01", 2))
order.__len__ = lambda: 99

len(order), order.__len__()
```

`order.__len__()` is an ordinary attribute lookup, so it finds the instance's lambda. `len(order)`
goes straight to `type(order).__len__`. Skipping the instance is part of what makes `len()` fast,
and it matters in lesson 5: to give a *class* a `len()`, the method has to live on the class's type.

## Let `collections.abc` fill in the rest

Writing a complete container by hand means a dozen methods: `index`, `count`, `__reversed__`,
`get`, `keys`, `items` and so on. The abstract base classes in `collections.abc` write them for you
from the few you provide. Inherit from `Mapping`, define `__getitem__`, `__iter__` and `__len__`,
and you get the rest:

```python
from collections.abc import Mapping

class PriceList(Mapping):
    def __init__(self, prices):
        self._prices = {sku.upper(): price for sku, price in prices.items()}

    def __getitem__(self, sku):
        return self._prices[sku.upper()]     # case-insensitive lookups

    def __iter__(self):
        return iter(self._prices)

    def __len__(self):
        return len(self._prices)

prices = PriceList({"mug-01": 8.50, "TEA-50": 4.20})
prices["Mug-01"], "tea-50" in prices, prices.get("LAMP-02", "no price"), dict(prices.items())
```

`__contains__`, `get`, `keys`, `items`, `values` and `==` all came from `Mapping`, and they all go
through your `__getitem__`, so the case rule applies everywhere. `Sequence` does the same for
`__getitem__` plus `__len__`, and `MutableMapping` and `MutableSequence` add the writing methods.
As with any ABC (module 5), forgetting a required method fails when you create an instance, not
later.

## Where this leaves you

`len`, indexing, `in`, `for`, truth tests and calls are all special methods looked up on the type.
`__getitem__` gets a `slice` for slices and doubles as a fallback for iteration and `in`, which is
why anything keyed by name needs `__contains__` and `__iter__` of its own. `__bool__` falls back to
`__len__`. `__call__` makes configurable, stateful functions. And `collections.abc` turns three
methods into a full container. The drills build a callable, a sequence and a lazy one, and repair a
lookup table that `in` breaks.
