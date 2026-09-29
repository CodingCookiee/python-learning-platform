---
slug: attribute-lookup
title: How attribute lookup works
summary: Follow obj.name from the instance dict through the class and its MRO, and intercept it with __getattr__, __getattribute__ and __setattr__.
minutes: 40
exercises:
  - attr-where-defined
  - attr-predict-lookup-order
  - attr-settings-fix
  - attr-change-tracking
  - attr-call-logger
---

`invoice.total` looks like reading a field. It's actually a search: Python looks in a sequence of
places until it finds the name, and a class can take over that search at several points. Module 5
gave you the short version (instance first, then the class, then its parents). This lesson shows
exactly where each attribute lives, walks the search by hand, and then uses the three hooks that
let you change it.

## Where attributes live

Attributes live in dictionaries. An instance's own attributes are in its `__dict__`; a class's
attributes, including its methods, are in the class's `__dict__`. `vars()` shows either:

```python
class Invoice:
    currency = "GBP"

    def __init__(self, number, total):
        self.number = number
        self.total = total

    def with_vat(self):
        return round(self.total * 1.2, 2)

inv = Invoice("INV-7", 100)

vars(inv), [name for name in vars(Invoice) if not name.startswith("__")]
```

`number` and `total` belong to this invoice. `currency` and `with_vat` belong to the class and are
shared by every invoice. The instance dict is an ordinary dict you can write to directly; the
class's is a read-only view (a `mappingproxy`), so class attributes change only through
`setattr` or assignment, which keeps Python's internal caches correct:

```python
class Invoice:
    currency = "GBP"

inv = Invoice()
inv.__dict__["paid"] = True

inv.paid, type(vars(Invoice)).__name__
```

## The search, step by step

For an ordinary attribute, `obj.name` checks the instance's `__dict__`, then the `__dict__` of
each class in `type(obj).__mro__`, in order, and raises `AttributeError` if none has it. Here's that
search written out, run against a subclass:

```python
def find_attribute(obj, name):
    """Where obj.name would be found, and the raw value stored there."""
    if name in getattr(obj, "__dict__", {}):
        return "instance", obj.__dict__[name]
    for cls in type(obj).__mro__:
        if name in vars(cls):
            return cls.__name__, vars(cls)[name]
    raise AttributeError(name)

class Invoice:
    currency = "GBP"

    def __init__(self, number, total):
        self.number = number
        self.total = total

    def with_vat(self):
        return round(self.total * 1.2, 2)

class CreditNote(Invoice):
    currency = "EUR"

note = CreditNote("CN-2", -40)
for name in ["total", "currency", "with_vat", "__repr__"]:
    print(f"{name:<9}", *find_attribute(note, name))
```

`__repr__` came from `object`, the last class in every MRO. Notice what `with_vat` found: a plain
**function**, not the bound method you get from `note.with_vat`. The step that turns one into the
other is the one piece this search leaves out, and it's the subject of the next lesson.

> [!JS]
> Coming from JavaScript: this is the prototype chain. The instance dict is the object's own
> properties, and `__mro__` is the chain of prototypes, flattened into a tuple you can inspect.

## Instances can shadow the class

Because the instance dict is checked first, an instance attribute hides a class attribute of the
same name, even a method. Deleting it uncovers the class's one again:

```python
class Invoice:
    def status(self):
        return "open"

inv = Invoice()
inv.status = lambda: "paid (set on this invoice only)"
print(inv.status(), "|", Invoice().status())

del inv.status
inv.status()
```

That's how test doubles patch one object without touching its class. It's also why the special
methods from lesson 2 are looked up on the type: shadowing `len()` per instance would make it slow
and surprising.

```quiz
question: "`CreditNote` inherits from `Invoice`. Both define `currency`, and the instance `note` has `currency` in its `__dict__` too. Which value does `note.currency` return?"
options:
  - "Invoice's"
  - "CreditNote's"
  - "The instance's"
answer: 2
explain: "The instance dict is searched before any class, so its value wins. Without it, CreditNote's would win, because CreditNote comes before Invoice in the MRO."
```

## `__getattr__`: a fallback for missing names

If a class defines `__getattr__(self, name)`, Python calls it **only when the normal search fails**.
Attributes that exist are found as usual and never reach it. That makes it the tool for attribute
access onto data you hold somewhere else:

```python
class Settings:
    def __init__(self, values):
        self._values = dict(values)

    def __getattr__(self, name):
        try:
            return self._values[name]
        except KeyError:
            raise AttributeError(f"no setting called {name!r}") from None

settings = Settings({"currency": "EUR", "timeout": 30})

settings.currency, settings.timeout, getattr(settings, "retries", 3), hasattr(settings, "debug")
```

`self._values` inside `__getattr__` is found by the normal search, so it doesn't loop. Converting
`KeyError` to `AttributeError` is not a nicety: `getattr` with a default and `hasattr` both work by
catching `AttributeError`, and nothing else.

```python raises
class Settings:
    def __init__(self, values):
        self._values = dict(values)

    def __getattr__(self, name):
        return self._values[name]

hasattr(Settings({"currency": "EUR"}), "debug")
```

`__getattr__` is also how you write a **proxy**: an object that forwards everything to another one,
and changes just the parts it cares about.

```python
class MaskedCard:
    """A customer record that hides all but the last four digits of the card."""

    def __init__(self, record):
        self._record = record

    def __getattr__(self, name):
        value = getattr(self._record, name)
        return "**** " + value[-4:] if name == "card_number" else value

class Customer:
    def __init__(self, name, card_number):
        self.name = name
        self.card_number = card_number

safe = MaskedCard(Customer("Ada", "4929123456781234"))
safe.name, safe.card_number
```

## `__getattribute__`: every single lookup

`__getattribute__` is the search itself. `object` provides the default one, the algorithm above.
Override it and you're called for **every** attribute access on the instance: existing attributes,
methods, and even `self.name` inside your own methods.

```python
from collections import Counter

class Customer:
    reads = Counter()                   # on the class, shared by every customer

    def __init__(self, name, email):
        self.name = name
        self.email = email

    def __getattribute__(self, name):
        type(self).reads[name] += 1
        return super().__getattribute__(name)

    def greeting(self):
        return f"Dear {self.name}"

ada = Customer("Ada", "ada@example.com")
ada.greeting(), ada.email, Customer.reads
```

Reading the method counted, and so did `self.name` inside it. The work is always handed to
`super().__getattribute__(name)` (or `object.__getattribute__(self, name)`), and the counter is
reached through `type(self)`, which doesn't go through the hook. Reading `self.reads` there
instead would call `__getattribute__` again, forever. Since it
slows down every access, reach for it only when you really must intercept attributes that exist.
For missing ones, `__getattr__` is enough, and if a class has both, `__getattr__` runs when
`__getattribute__` raises `AttributeError`.

> [!JS]
> Coming from JavaScript: a `Proxy` with a `get` trap sees every property read, like
> `__getattribute__`. Python's `__getattr__` has no JS equivalent: it's a trap that fires only for
> properties that don't exist.

## `__setattr__` and `__delattr__`

Assignment has a hook too. `obj.name = value` calls `type(obj).__setattr__(obj, name, value)`
for every assignment, including the ones in `__init__`, and `del obj.name` calls `__delattr__`.
Here's an immutable value object, which is exactly how frozen dataclasses work:

```python
class Money:
    def __init__(self, amount, currency):
        object.__setattr__(self, "amount", amount)      # bypass our own __setattr__
        object.__setattr__(self, "currency", currency)

    def __setattr__(self, name, value):
        raise AttributeError(f"Money is immutable: can't set {name!r}")

    def __delattr__(self, name):
        raise AttributeError(f"Money is immutable: can't delete {name!r}")

fee = Money(5, "EUR")
try:
    fee.amount = 500
except AttributeError as error:
    print(error)

fee.amount, fee.currency
```

When your `__setattr__` does want to store the value, hand it on with
`super().__setattr__(name, value)`. Writing `self.name = value` inside `__setattr__` calls
`__setattr__` again, and the recursion only ends with `RecursionError`.

> [!WARNING]
> `__getattr__` has a recursion trap of its own. Copying or unpickling creates an instance
> without running `__init__`, so `self._values` doesn't exist yet, and reading it calls
> `__getattr__("_values")`, which reads `self._values`... Refusing underscored names at the top
> of `__getattr__` (`raise AttributeError(name)`) avoids it.

## `getattr`, `setattr`, `hasattr`, `delattr`

When the attribute's name is in a variable, say a CSV column or a key in a JSON payload, the
built-in functions do the same lookup and assignment by name:

```python
class Customer:
    def __init__(self, name):
        self.name = name

ada = Customer("Ada")
updates = {"email": "ada@new.example", "tier": "gold"}
for field, value in updates.items():
    setattr(ada, field, value)

[getattr(ada, field) for field in ("name", "email", "tier")], getattr(ada, "phone", "not given")
```

All four go through the same hooks: `setattr` calls `__setattr__`, and `hasattr(obj, name)` is
`getattr` with the `AttributeError` caught.

## Where this leaves you

Attributes live in the instance's `__dict__` and the classes' `__dict__`s, and the search checks the
instance and then each class in the MRO. `__getattr__` runs only when that search fails, and must
raise `AttributeError` for names it doesn't know. `__getattribute__` replaces the search for every
access and hands the real work to `super()`. `__setattr__` and `__delattr__` see every assignment
and deletion. The drills have you write the search, predict it, repair a settings object that
breaks `hasattr`, and build two objects that intercept access on purpose.
