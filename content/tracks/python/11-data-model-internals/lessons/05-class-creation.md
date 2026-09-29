---
slug: class-creation
title: How classes are made
summary: What the class statement really does, and its three hooks, __init_subclass__, class decorators and metaclasses, in the order you should reach for them.
minutes: 40
exercises:
  - meta-required-name
  - meta-predict-creation-order
  - meta-event-handlers
  - meta-metaclass-to-init-subclass
  - meta-registry-metaclass
---

A reporting tool exports to CSV and JSON, and a new format arrives every quarter. Adding one should
mean writing one class, with no list of formats to update somewhere else. For that, each exporter
class has to register itself **at the moment it's defined**, which means running your code while
Python builds the class. Lesson 1 showed that `type(name, bases, namespace)` makes a class. This
lesson shows everything the `class` statement does around that call, and where you can hook in.

## What the class statement does

When Python reaches a `class` statement, it:

1. works out the **metaclass**, the class that will build this class (`type`, unless you or a
   base class say otherwise),
2. makes an empty namespace dict for the class body,
3. runs the body, top to bottom, as ordinary code in that namespace,
4. calls `metaclass(name, bases, namespace)`, which creates the class object, calls
   `__set_name__` on every descriptor in the namespace, then calls `__init_subclass__` on the
   parent,
5. applies any class decorators, bottom one first,
6. binds the class's name.

Every numbered print below is one of those steps:

```python
class Field:
    def __set_name__(self, owner, name):
        print(f"3. __set_name__ for {owner.__name__}.{name}")

class Model:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        print(f"4. __init_subclass__ for {cls.__name__}")

def audited(cls):
    print(f"5. decorator on {cls.__name__}")
    return cls

print("1. before the class statement")

@audited
class Customer(Model):
    print("2. running the class body")
    email = Field()

print("6. the name is bound:", Customer)
```

The body is real code that runs once, so it can loop, call functions or print. Everything it
leaves behind in the namespace becomes an attribute of the class.

## `__init_subclass__`: code for every subclass

Define `__init_subclass__` on a base class and Python calls it with each new subclass, directly
or indirectly derived, but not with the base class itself. It's automatically a classmethod, and
keyword arguments written in the `class` line are passed to it:

```python
import json

class Exporter:
    formats = {}

    def __init_subclass__(cls, format, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.format = format
        Exporter.formats[format] = cls

class CsvExporter(Exporter, format="csv"):
    def export(self, rows):
        return "\n".join(",".join(map(str, row)) for row in rows)

class JsonExporter(Exporter, format="json"):
    def export(self, rows):
        return json.dumps(rows)

rows = [["INV-1", 120], ["INV-2", 80]]
sorted(Exporter.formats), Exporter.formats["csv"]().export(rows), JsonExporter.format
```

Adding XML is now one class and nothing else. Passing `**kwargs` on to `super()` keeps it
cooperative when several bases in an MRO define the hook.

Because the hook runs while the class is being built, it can also **refuse** a class. Here the
missing keyword is caught the moment the module is imported, not when a customer first asks for
XML:

```python raises
class Exporter:
    formats = {}

    def __init_subclass__(cls, format, **kwargs):
        super().__init_subclass__(**kwargs)
        Exporter.formats[format] = cls

class XmlExporter(Exporter):
    pass
```

To enforce a rule of your own, check the class and `raise TypeError` inside the hook.

> [!JS]
> Coming from JavaScript: a `static { }` block runs once, for the one class it's written in.
> `__init_subclass__` is written once on the base and runs for every class that extends it.

## Class decorators run on one class

A class decorator (module 8) runs after the class exists, and applies to the one class it's
written above. Subclasses don't inherit it:

```python
registered = []

def plugin(cls):
    registered.append(cls.__name__)
    return cls

@plugin
class Plugin:
    pass

class SlackPlugin(Plugin):
    pass

registered
```

That difference decides which one to use. A decorator is an opt-in feature for a class, like
`@dataclass` or `@total_ordering`: each class chooses it. `__init_subclass__` is a rule for a whole
family, like "every exporter registers itself": no subclass can forget it.

```quiz
question: "Every webhook handler class must register itself under an event name, and new handlers are added by other teams. Which hook fits?"
options:
  - "A class decorator on each handler"
  - "__init_subclass__ on the handler base class"
  - "A metaclass"
answer: 1
explain: "It's a rule for every subclass, so put it on the base class where nobody can forget it. A decorator would have to be remembered on each handler, and a metaclass is more machinery than the job needs."
```

## Metaclasses: the class of a class

A class is an instance of its metaclass, and so far that has always been `type`. A metaclass is a
subclass of `type`, and its methods apply to **classes** the way a class's methods apply to
instances. It can customise creation (by overriding `__new__` or `__init__`), but so can the hooks
above. The thing only a metaclass can do is give the class object itself behaviour: special
methods are looked up on the type (lesson 2), so for `len(SomeClass)` to work, `__len__` has to be
on the class's type.

That's exactly how `enum` works:

```python
from enum import Enum

class Currency(Enum):
    GBP = "£"
    EUR = "€"

type(Currency).__name__, len(Currency), [c.name for c in Currency], Currency["EUR"].value
```

`Currency` is an instance of `EnumType`, which defines `__len__`, `__iter__` and `__getitem__`.
Here's a small metaclass of your own that does the same for a class of constants:

```python
class ConstantsMeta(type):
    def __iter__(cls):
        return (value for name, value in vars(cls).items() if name.isupper())

    def __len__(cls):
        return sum(1 for _ in cls)

class OrderStatus(metaclass=ConstantsMeta):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"

list(OrderStatus), len(OrderStatus), "paid" in OrderStatus, type(OrderStatus).__name__
```

`"paid" in OrderStatus` works too, through the `__iter__` fallback from lesson 2. A metaclass also
defines what calling a class does (`type.__call__` is what runs `__new__` and then `__init__`), and
it can supply the namespace the body runs in with `__prepare__`.

## Why you rarely need one

A metaclass is inherited by every subclass, and a class can only have one. Combine two bases whose
metaclasses aren't related, and Python can't pick:

```python raises
from abc import ABC

class ConstantsMeta(type):
    pass

class Constants(metaclass=ConstantsMeta):
    pass

class AuditedConstants(Constants, ABC):     # ABC's metaclass is ABCMeta
    pass
```

That's the real cost: a metaclass in a library forces itself on every user's class hierarchy. So
work down this list and stop at the first thing that does the job:

1. **A class decorator** when one class opts into a feature.
2. **`__init_subclass__`** when every subclass must be registered, checked or configured.
3. **A descriptor with `__set_name__`** when the behaviour belongs to one attribute (lesson 4).
4. **A metaclass** only when the class object itself needs behaviour, such as operators on the
   class or a custom body namespace. That's framework territory: `Enum`, `ABC`, Django's models and
   Pydantic's `BaseModel` all use one, so their users don't have to.

> [!TIP]
> If you find yourself writing a metaclass whose only job is registering or validating subclasses,
> it's an `__init_subclass__` method in disguise. The drills include exactly that refactor.

## Where this leaves you

The `class` statement runs the body in a fresh namespace, then asks the metaclass to build the
class, which calls `__set_name__` on descriptors and `__init_subclass__` on the parent; decorators
run last. `__init_subclass__` enforces rules and registers every subclass; a class decorator is an
opt-in for one class; a metaclass is for behaviour of the class object itself, and costs every
hierarchy that inherits it. The drills have you predict the order, register and validate
subclasses, retire an unnecessary metaclass, and write the one kind that earns its place.
