---
slug: instance-and-class-attributes
title: Instance and class attributes
summary: Attribute lookup falls back from the instance to its class, which makes class attributes useful and one of them dangerous.
minutes: 30
exercises:
  - oop-predict-attribute-lookup
  - oop-shared-order-lines
  - oop-invoice-numbering
  - oop-user-registry
---

Here's a support-ticket class with a bug that ships to production surprisingly often. Tag one
ticket, and every ticket gets the tag:

```python
class Ticket:
    tags = []

    def __init__(self, subject):
        self.subject = subject

    def tag(self, label):
        self.tags.append(label)

refund = Ticket("Refund not received")
login = Ticket("Can't log in")
refund.tag("billing")
login.tags
```

To see why, you need to know where Python looks when you write `login.tags`. That lookup rule is
what this lesson is about.

## Attributes on the class itself

A name assigned in the class body, outside any method, is a **class attribute**. It belongs to the
class object, and every instance can read it:

```python
class Invoice:
    currency = "EUR"
    payment_terms_days = 30

    def __init__(self, customer, amount):
        self.customer = customer
        self.amount = amount

march = Invoice("Northwind", 1200)
april = Invoice("Contoso", 800)

march.currency, april.currency, Invoice.currency
```

`customer` and `amount` are **instance attributes**, set through `self` and stored on each instance.
`currency` is stored once, on the class. `vars()` shows the difference:

```python
class Invoice:
    currency = "EUR"

    def __init__(self, customer, amount):
        self.customer = customer
        self.amount = amount

march = Invoice("Northwind", 1200)
vars(march), "currency" in vars(Invoice)
```

## Lookup falls back from instance to class

When you read `march.currency`, Python checks the instance's own `__dict__` first. It isn't there,
so Python looks on the class, and finds it. (Later in this module, with inheritance, the search
carries on up to parent classes too.)

That fallback is live. Change the class attribute and every instance that doesn't have its own
copy sees the new value at once:

```python
class Invoice:
    currency = "EUR"

march = Invoice()
april = Invoice()
Invoice.currency = "GBP"
march.currency, april.currency
```

Methods are found the same way. `march.total()` finds `total` on the class, which is why methods
defined once serve every instance.

> [!JS]
> Coming from JavaScript: this is the prototype chain. The instance's own properties come first,
> then the class, just like an object's own properties shadow those on its prototype.

## Assignment always writes to the instance

Reading falls back to the class; **writing never does**. `march.currency = "USD"` creates an
instance attribute on `march` that **shadows** the class attribute, and leaves the class alone:

```python
class Invoice:
    currency = "EUR"

march = Invoice()
april = Invoice()
march.currency = "USD"

march.currency, april.currency, Invoice.currency, vars(march)
```

That's often what you want: a class attribute as a default that one instance can override. It also
catches people out with counters. `self.count += 1` reads the class's value, adds one, and then
**writes a new instance attribute**, so the class's counter never moves:

```python
class Invoice:
    issued = 0

    def __init__(self):
        self.issued += 1     # reads Invoice.issued, writes self.issued

Invoice()
Invoice()
Invoice.issued
```

To change shared state, write to the class explicitly: `Invoice.issued += 1`.

```quiz
question: "After `class Plan: price = 10`, `a = Plan()`, `a.price = 25` and `Plan.price = 12`, what is `a.price`?"
options:
  - "10"
  - "12"
  - "25"
answer: 2
explain: a.price = 25 created an instance attribute on a. Lookup finds it before ever reaching the class, so changing Plan.price has no effect on a.
```

## The shared mutable class attribute trap

Back to the ticket bug. `self.tags.append(label)` doesn't assign to `self.tags`; it **reads** it
and then mutates the list it finds. The instance has no `tags`, so lookup finds the class's one
list, and every ticket appends to that same list.

```python
class Ticket:
    tags = []

    def tag(self, label):
        self.tags.append(label)

refund = Ticket()
login = Ticket()
refund.tag("billing")

refund.tags is login.tags is Ticket.tags
```

It's the same trap as the mutable default argument in module 3: one object, created once when the
`class` statement ran, shared by everyone. The fix is the same too. Create a fresh list per
instance, in `__init__`:

```python
class Ticket:
    def __init__(self, subject):
        self.subject = subject
        self.tags = []            # a new list for every ticket

    def tag(self, label):
        self.tags.append(label)

refund = Ticket("Refund not received")
login = Ticket("Can't log in")
refund.tag("billing")
refund.tags, login.tags
```

> [!WARNING]
> A mutable value (a list, dict or set) in a class body is shared by every instance. Unless that's
> exactly what you mean, create it in `__init__` instead.

## Class attributes done right

Class attributes are the right tool for three jobs:

- **Constants** that belong with the class: `Invoice.VAT_RATE = 0.2`, `Ticket.PRIORITIES = ("low",
  "normal", "urgent")`. Immutable, so sharing is safe.
- **Defaults** an instance may override, like `currency` above.
- **Deliberately shared state**, such as a counter or a registry of every instance, written through
  the class name so nobody mistakes it for per-instance data.

```python
class Invoice:
    VAT_RATE = 0.2
    next_number = 1

    def __init__(self, customer, net):
        self.customer = customer
        self.net = net
        self.number = f"INV-{Invoice.next_number:04d}"
        Invoice.next_number += 1

    def gross(self):
        return round(self.net * (1 + self.VAT_RATE), 2)

first = Invoice("Northwind", 100)
second = Invoice("Contoso", 250)
first.number, second.number, second.gross()
```

Reading `self.VAT_RATE` is fine (it falls back to the class). Writing the counter goes through
`Invoice.` on purpose.

## Where this leaves you

Reading an attribute checks the instance, then the class. Writing one always writes to the
instance, which shadows the class value. Keep per-instance data in `__init__`, keep shared mutable
data on the class only when sharing is the point, and write shared state through the class name.
The drills make you predict lookups, fix the shared-list bug, and use shared state deliberately.
