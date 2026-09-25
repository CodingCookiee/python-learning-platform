---
slug: dataclass-essentials
title: Dataclasses
summary: Let @dataclass write __init__, __repr__, __eq__ and more, then tune it with field(), __post_init__, frozen, order and slots.
minutes: 40
exercises:
  - oop-dataclass-refactor
  - oop-dataclass-defaults-fix
  - oop-booking-post-init
  - oop-frozen-address
  - oop-sortable-deliveries
---

Here is a perfectly good class that does almost nothing:

```python
class Customer:
    def __init__(self, name, email, tier="standard"):
        self.name = name
        self.email = email
        self.tier = tier

    def __repr__(self):
        return f"Customer(name={self.name!r}, email={self.email!r}, tier={self.tier!r})"

    def __eq__(self, other):
        if not isinstance(other, Customer):
            return NotImplemented
        return (self.name, self.email, self.tier) == (other.name, other.email, other.tier)

Customer("Ada", "ada@example.com")
```

Each field name appears five times, and adding a field means editing three methods. A class whose
main job is to hold data is so common that the standard library writes all of that for you.

## @dataclass writes the boilerplate

Decorate a class with `@dataclass` and list its fields as **annotated** class-level names,
`name: type`. The decorator reads them and generates `__init__`, `__repr__` and `__eq__`:

```python
from dataclasses import dataclass

@dataclass
class Customer:
    name: str
    email: str
    tier: str = "standard"

ada = Customer("Ada", "ada@example.com")
ada, ada == Customer("Ada", "ada@example.com"), ada.tier
```

That's the whole class from above, and it behaves the same: the same `__init__` arguments, the same
repr and value equality. It's still an ordinary class, so you can add methods and properties to it.

```python
from dataclasses import dataclass

@dataclass
class Customer:
    name: str
    email: str
    tier: str = "standard"

    @property
    def domain(self):
        return self.email.split("@")[1]

    def upgrade(self):
        self.tier = "gold"

ada = Customer("Ada", "ada@example.com")
ada.upgrade()
ada, ada.domain
```

> [!JS]
> Coming from TypeScript: `name: str` looks like a type annotation, and it is one, but Python
> doesn't check it at runtime. `Customer(42, None)` works. Module 9 shows how mypy and Pydantic
> enforce types.

## Defaults and `field(default_factory=...)`

A field with a default must come after the fields without one, exactly as with function
parameters. And the mutable-default trap from lesson 2 is back: a default is created once, when the
class is defined. Dataclasses refuse the most common case outright:

```python raises
from dataclasses import dataclass

@dataclass
class Order:
    customer: str
    lines: list = []
```

The fix is `field(default_factory=...)`: a function the generated `__init__` calls to make a
**fresh** default for each instance. Any zero-argument callable works, including `list`, `dict`
and your own functions:

```python
from dataclasses import dataclass, field
from itertools import count

order_numbers = count(1)

def next_order_id():
    return f"ORD-{next(order_numbers):04d}"

@dataclass
class Order:
    customer: str
    lines: list = field(default_factory=list)
    order_id: str = field(default_factory=next_order_id)

first = Order("Ada")
second = Order("Grace")
first.lines.append(("Mug", 1, 8.0))
first, second
```

> [!WARNING]
> Dataclasses only catch `list`, `dict` and `set` defaults. `order_id: str = next_order_id()` is
> accepted, and calls the function once, at class definition, so every order gets the same id.
> Anything that must be fresh per instance needs `default_factory`.

## Checking and deriving values in `__post_init__`

The generated `__init__` just assigns fields. To validate them, or compute a field from others,
define `__post_init__`; the generated `__init__` calls it last. A field that's computed rather than
passed in is declared with `field(init=False)`:

```python
from dataclasses import dataclass, field

@dataclass
class LineItem:
    sku: str
    quantity: int
    unit_price: float
    total: float = field(init=False)

    def __post_init__(self):
        if self.quantity <= 0:
            raise ValueError(f"Quantity must be positive, got {self.quantity}")
        self.sku = self.sku.upper()
        self.total = round(self.quantity * self.unit_price, 2)

LineItem("mug-01", 3, 8.0)
```

`total` is shown in the repr and compared by `==`, but it isn't an `__init__` parameter.

## `frozen=True`: immutable values

`@dataclass(frozen=True)` makes instances read-only after creation. Freezing is what you want for
values: money, addresses, coordinates, SKUs. Because a frozen instance can't change, the dataclass
also generates a `__hash__` matching `__eq__` (the rule from lesson 4), so it works in sets and as a
dict key.

```python
from dataclasses import dataclass, replace

@dataclass(frozen=True)
class Money:
    amount: float
    currency: str

price = Money(12.5, "EUR")
discounted = replace(price, amount=10.0)    # a modified copy
price, discounted, {price: "list price"}[Money(12.5, "EUR")]
```

```python raises
from dataclasses import dataclass

@dataclass(frozen=True)
class Money:
    amount: float
    currency: str

price = Money(12.5, "EUR")
price.amount = 0
```

`dataclasses.replace()` is how you "change" a frozen object: it builds a new one with some fields
swapped. A plain (unfrozen) dataclass has `__eq__` and so, as in lesson 4, is unhashable.

## `order=True`: sorting by fields

`@dataclass(order=True)` adds `<`, `<=`, `>` and `>=`, comparing instances as tuples of their fields
**in the order they're declared**. So put the sort key first, and leave fields out of comparisons
with `field(compare=False)`:

```python
from dataclasses import dataclass, field
from datetime import date

@dataclass(order=True)
class Task:
    due: date
    priority: int
    title: str = field(compare=False)

tasks = [
    Task(date(2026, 10, 1), 2, "Send invoices"),
    Task(date(2026, 9, 28), 1, "Renew domain"),
    Task(date(2026, 10, 1), 1, "Pay suppliers"),
]
[task.title for task in sorted(tasks)]
```

Ties on `due` fall through to `priority`, and `title` is ignored. (`compare=False` also leaves the
field out of `==` and the hash.)

```quiz
question: "With `@dataclass(order=True)` and fields `name: str` then `score: int`, how are two instances ordered?"
options:
  - By score, then name
  - By name, then score
  - Only by the fields you mark with compare=True
answer: 1
explain: Ordering compares fields as a tuple in declaration order, so name decides first and score breaks ties. To sort by score, declare it first.
```

## `slots=True`: a fixed set of attributes

Normally every instance carries a `__dict__`, so you can attach any attribute to it, including a
misspelled one. `@dataclass(slots=True)` stores the fields in fixed slots instead. Instances use
less memory, attribute access is a little faster, and assigning an attribute that isn't a field
fails loudly:

```python raises
from dataclasses import dataclass

@dataclass(slots=True)
class Delivery:
    tracking: str
    status: str = "pending"

parcel = Delivery("RA123456785GB")
parcel.status = "delivered"     # fine: a field
parcel.stauts = "returned"      # a typo, and slots catch it
```

Module 11 explains how `__slots__` works under the hood.

> [!TIP]
> `dataclasses.asdict(obj)` turns a dataclass (and any dataclasses nested inside it) into a plain
> dict, ready for `json.dumps`. `dataclasses.fields(cls)` lists the fields, if you need them in a
> loop.

## Where this leaves you

`@dataclass` generates `__init__`, `__repr__` and `__eq__` from annotated fields. Use
`field(default_factory=...)` for anything that must be fresh per instance, `__post_init__` to
validate and derive, `frozen=True` for hashable values, `order=True` to sort by fields in
declaration order, and `slots=True` for a fixed set of attributes. Reach for a dataclass whenever a
class mainly holds data.
