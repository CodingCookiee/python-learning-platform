---
slug: everything-is-an-object
title: Everything is an object
summary: Values, functions, classes and modules are all objects with a type, and hashing ties an object's value to where dicts and sets file it.
minutes: 35
exercises:
  - model-predict-type-of-type
  - model-kind-of
  - model-record-class-factory
  - model-mutable-key-fix
  - model-email-address
---

In module 1 you learned that a variable is a label on an object. This module is about the objects
themselves: what they're made of, how Python finds their attributes, how classes get built, and
what happens to an object when nothing points at it any more. It starts with the claim that
everything else rests on. In Python, *everything* is an object, including the things that make
objects:

```python
import json
from decimal import Decimal

def add_vat(amount):
    return amount * Decimal("1.2")

for thing in [42, "INV-1042", add_vat, Decimal, json, None, type]:
    print(f"{type(thing).__name__:<10} {thing!r:.45}")
```

A number, a function, a class, a module, `None`, and even `type` itself: each one is an object
with a type. This lesson shows what that buys you, and ends with the rule that decides whether an
object can be a dict key.

## Type, identity and value

Every object has three things:

- a **type**, which decides what it can do (`type(x)`, or `x.__class__`),
- an **identity**, fixed for its whole life (`id(x)`, compared with `is`),
- a **value**, which for mutable objects can change.

The type is an object too, so you can store it, compare it and call it to make another instance:

```python
from decimal import Decimal

invoice_total = Decimal("99.50")
kind = type(invoice_total)

kind, kind is Decimal, invoice_total.__class__ is kind, kind("12.30")
```

The type is where an object's behaviour lives. `invoice_total + 1` works because `Decimal` defines
addition; the `Decimal` instance itself only holds a value. Lesson 3 follows that lookup step by
step.

## `type()` versus `isinstance()`

`type(x)` gives the exact class. `isinstance(x, cls)` asks "is `x` a `cls`, or a subclass of it?",
which is almost always the better question:

```python
from collections import OrderedDict

settings = OrderedDict(currency="GBP", vat=0.2)

type(settings) == dict, isinstance(settings, dict)
```

An `OrderedDict` *is* a dict, so code that checks `type(x) == dict` wrongly rejects it. The same
rule has a famous edge: `bool` is a subclass of `int`, so `True` passes an `int` check.

```python
isinstance(True, int), True + True, type(True) is int
```

When a function takes a quantity, check for `bool` first if a stray `True` would be a bug.

```quiz
question: "Which check accepts a `defaultdict` of config sections as a dict?"
options:
  - "type(section) == dict"
  - "type(section) is dict"
  - "isinstance(section, dict)"
answer: 2
explain: "defaultdict is a subclass of dict. type() compares the exact class, so both type checks say no; isinstance follows the subclass relationship."
```

## Classes and functions are objects too

Because a class is an object, you can put it in a dict and pick one at run time. That's a
dispatch table, and it replaces a chain of `if format == ...` branches:

```python
class CsvReport:
    extension = ".csv"

class JsonReport:
    extension = ".json"

REPORTS = {"csv": CsvReport, "json": JsonReport}

report = REPORTS["json"]()
type(report).__name__, report.extension, type(REPORTS["csv"])
```

Functions are objects of type `function`, with attributes of their own: a name, their default
values, the compiled code, and a `__dict__` you can add to.

```python
def apply_discount(price, rate=0.1):
    return round(price * (1 - rate), 2)

apply_discount.owner = "pricing team"

apply_discount.__name__, apply_discount.__defaults__, vars(apply_discount), type(apply_discount)
```

`vars(obj)` returns an object's `__dict__`, the namespace where its own attributes are stored. You'll
use it constantly in this module to see where an attribute really lives.

## `type(type)` is `type`

If every class is an object, every class has a type. For almost every class, that type is `type`:

```python
from decimal import Decimal

class Invoice:
    pass

type(Invoice), type(Decimal), type(int), type(type)
```

`type` is the class of classes, and it is its own type, which is where the chain stops. There are
two separate relationships in play, and it helps to keep them apart:

```text
instance of:  INV-1042 (an Invoice)  ->  Invoice  ->  type  ->  type
subclass of:  Invoice  ->  object        type  ->  object
```

`type()` follows the first, `__mro__` (and `issubclass`) follows the second. `object` is the root of
every class hierarchy, and `type` is the root of every class's type, so each is an instance or a
subclass of the other:

```python
isinstance(object, type), issubclass(type, object), isinstance(type, object), bool.__mro__
```

> [!JS]
> Coming from JavaScript: a JS class is really a function, and inheritance is a chain of prototype
> objects. In Python a class is an instance of `type`, and inheritance is the `__mro__` tuple.

## `type()` can build a class

Called with three arguments, `type(name, bases, namespace)` creates a new class. The `class`
statement does exactly this for you (lesson 5 takes it apart), which is how `namedtuple`,
dataclasses and ORMs can make classes while a program runs:

```python
def describe(self):
    return f"{self.sku}: {self.quantity} {self.unit}"

StockLine = type("StockLine", (), {"unit": "each", "describe": describe})

line = StockLine()
line.sku, line.quantity = "MUG-01", 12
line.describe(), type(StockLine), StockLine.__name__
```

The namespace dict becomes the class's attributes, and a function in it becomes a method.

## Default equality is identity

A class that doesn't define `__eq__` or `__hash__` inherits them from `object`. There, `==` means
`is`, and the hash is derived from the object's identity, so every instance is distinct and every
instance is hashable:

```python
class Customer:
    def __init__(self, email):
        self.email = email

ada = Customer("ada@example.com")
ada_again = Customer("ada@example.com")

ada == ada_again, ada == ada, len({ada, ada_again}), Customer.__eq__ is object.__eq__
```

That default is consistent: equal objects (the same object) always have equal hashes. The moment
you define `__eq__` by value, you take on the job of keeping it consistent yourself.

## The hash contract

Dicts and sets find a key in two steps. They compute `hash(key)` to jump straight to a small group
of candidate slots, then compare each candidate with `is` and then `==`. So the whole scheme rests
on one rule, the **hash contract**:

> If `a == b`, then `hash(a) == hash(b)`, and an object's hash never changes while it's a key.

Here are the two steps, printed as they happen:

```python
class Sku:
    def __init__(self, code):
        self.code = code

    def __eq__(self, other):
        print(f"  __eq__ {self.code} vs {other.code}")
        return isinstance(other, Sku) and self.code == other.code

    def __hash__(self):
        print(f"  __hash__ {self.code}")
        return hash(self.code)

mug = Sku("MUG-01")
print("store:")
stock = {mug: 12}
print("look up an equal Sku:")
stock[Sku("MUG-01")]
print("look up the same Sku:")
stock[mug]
```

The last lookup never called `__eq__`: when the candidate *is* the key, the dict doesn't need to
ask. You can see that shortcut with a value that isn't even equal to itself:

```python
missing = float("nan")
missing == missing, missing in [missing]
```

## Why mutable objects shouldn't be hashable

The second half of the contract is the one that bites. Here's a warehouse bin used as a key, then
relabelled:

```python
class Location:
    def __init__(self, aisle, shelf):
        self.aisle = aisle
        self.shelf = shelf

    def __eq__(self, other):
        return isinstance(other, Location) and (self.aisle, self.shelf) == (other.aisle, other.shelf)

    def __hash__(self):
        return hash((self.aisle, self.shelf))

bin_a3 = Location("A", 3)
stock = {bin_a3: 40}
bin_a3.shelf = 4          # the bin gets a new label

bin_a3 in stock, Location("A", 3) in stock, Location("A", 4) in stock, len(stock)
```

The 40 units are still in the dict, but nothing can reach them. The entry is filed under the hash of
`("A", 3)`, while the key now compares as `("A", 4)`: look up `A-3` and the hash matches but `==`
says no; look up `A-4` and the search starts in the wrong place.

That's why Python's own mutable containers refuse to be hashed at all:

```python raises
stock = {["A", 3]: 40}
```

It's also why defining `__eq__` sets `__hash__` to `None` (module 5): Python won't guess that your
fields are safe to hash. Make a class hashable only when the fields in its hash can't change, for
example with a frozen dataclass:

```python
from dataclasses import dataclass, FrozenInstanceError

@dataclass(frozen=True)
class Location:
    aisle: str
    shelf: int

stock = {Location("A", 3): 40}
try:
    next(iter(stock)).shelf = 4
except FrozenInstanceError as error:
    print("refused:", error)

stock[Location("A", 3)]
```

> [!WARNING]
> "It works in my tests" is no defence here. A key mutated after insertion only fails when that
> particular object is looked up again, which can be hours later and far from the line that
> changed it.

## Where this leaves you

Everything is an object with a type; `type()` gives the exact class and `isinstance()` respects
subclasses. Classes are objects whose type is `type`, and `type(name, bases, namespace)` builds one.
By default equality is identity; once you define `__eq__` by value, `__hash__` must agree with it
and must never change, which is why mutable objects stay unhashable. The drills make you predict
the type relationships, build a class without the `class` statement, and rescue stock lost to a
mutated key.
