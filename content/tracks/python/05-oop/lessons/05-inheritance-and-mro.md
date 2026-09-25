---
slug: inheritance-and-mro
title: Inheritance, super() and the MRO
summary: Subclasses reuse and extend a parent's behaviour; the MRO decides where every lookup and every super() call goes.
minutes: 40
exercises:
  - oop-admin-user
  - oop-missing-super-init
  - oop-predict-diamond-mro
  - oop-notifier-abc
  - oop-cooperative-mixins
---

An admin is a user with extra powers. A savings account is a bank account that earns interest.
When one class is a more specific kind of another, **inheritance** lets it reuse everything the
general class does and change only what's different. This lesson shows how that works, and the one
rule, the MRO, that explains every inheritance puzzle Python can throw at you.

## A subclass inherits everything

Put the parent class in brackets after the new class's name. The subclass gets every method and
class attribute of the parent, and can **override** any of them by defining its own:

```python
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email

    def can(self, permission):
        return permission in {"read", "comment"}

    def describe(self):
        return f"{self.name} <{self.email}>"

class Admin(User):
    def can(self, permission):
        return True

root = Admin("Ada", "ada@example.com")
root.describe(), root.can("delete"), User("Grace", "g@example.com").can("delete")
```

`Admin` wrote no `__init__` and no `describe`, so lookup carries on past `Admin` to `User` and
finds them there: instance first, then its class, then the parent class. `can` is found on `Admin`
first, so it wins.

```python
class User:
    pass

class Admin(User):
    pass

root = Admin()
isinstance(root, Admin), isinstance(root, User), issubclass(Admin, User), issubclass(User, Admin)
```

An `Admin` **is a** `User`, so anything that accepts a `User` accepts an `Admin` too.

## Extending a parent method with super()

Overriding replaces the parent's method completely. Usually you want to **extend** it instead: do
what the parent does, plus a little more. `super()` gives you the parent's version to call.

The classic mistake is a subclass `__init__` that forgets to call the parent's:

```python raises
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

class SavingsAccount(BankAccount):
    def __init__(self, owner, rate):
        self.rate = rate            # BankAccount.__init__ never runs

savings = SavingsAccount("Grace", 0.03)
savings.balance
```

Defining `__init__` in the subclass overrides the parent's one, so `owner` and `balance` are never
set. Call it through `super()`:

```python
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def describe(self):
        return f"{self.owner}: {self.balance:.2f}"

class SavingsAccount(BankAccount):
    def __init__(self, owner, rate, balance=0):
        super().__init__(owner, balance)
        self.rate = rate

    def describe(self):
        return super().describe() + f" at {self.rate:.1%}"

    def add_interest(self):
        self.balance += round(self.balance * self.rate, 2)

savings = SavingsAccount("Grace", 0.03, 1000)
savings.add_interest()
savings.describe()
```

> [!JS]
> Coming from JavaScript: a subclass constructor must call `super()` before using `this`, and JS
> enforces it. Python doesn't: forget `super().__init__()` and nothing complains until an attribute
> the parent should have set turns out to be missing.

## Multiple parents and the MRO

A class can have several parents. That raises a question: when two parents both define a method,
which one wins? Python answers it by flattening the family tree into one ordered list, the
**method resolution order** (MRO), and searching it left to right. Every class has it in `__mro__`:

```python
class Document:
    def save(self):
        return "saved to disk"

class Versioned(Document):
    def save(self):
        return "saved a new version"

class Encrypted(Document):
    def save(self):
        return "saved encrypted"

class Contract(Versioned, Encrypted):
    pass

[cls.__name__ for cls in Contract.__mro__], Contract().save()
```

This shape, where two parents share a grandparent, is called a **diamond**. The MRO (computed by an
algorithm called C3) always keeps three promises:

- a class comes before its parents,
- parents keep the order they're listed in the `class` line,
- every class appears exactly once, so the shared grandparent `Document` comes after both of its
  children, and `object`, the root of every class, comes last.

> [!JS]
> Coming from JavaScript: the prototype chain is a single line, so there is nothing to resolve.
> Python's MRO is that line, computed from a tree that can have several parents per class.

## What super() really means

Here's the part most people get wrong: `super()` does **not** mean "my parent class". It means "the
next class after this one **in the MRO of the object I'm working on**". In a diamond, that's often
a sibling, not a parent:

```python
class Document:
    def save(self):
        return ["document"]

class Versioned(Document):
    def save(self):
        return ["versioned"] + super().save()

class Encrypted(Document):
    def save(self):
        return ["encrypted"] + super().save()

class Contract(Versioned, Encrypted):
    def save(self):
        return ["contract"] + super().save()

Contract().save()
```

`Versioned` inherits only from `Document`, yet its `super().save()` called `Encrypted.save`, because
for a `Contract`, `Encrypted` is next in line. Each class calls `super()` once, the chain visits
every class exactly once, and `Document` runs last. This is called **cooperative** inheritance, and
it only works if every class in the chain calls `super()`.

```quiz
question: "With `class D(B, C)`, `class B(A)` and `class C(A)`, what is `D`'s MRO?"
options:
  - "D, B, A, C, object"
  - "D, B, C, A, object"
  - "D, C, B, A, object"
answer: 1
explain: "Parents keep their listed order (B before C), and the shared parent A can only come after both of its children. So D, B, C, A, then object."
```

## Mixins: small classes that add one thing

A **mixin** is a small class that adds one capability and is meant to be combined with others,
listed before the main base class. Because it uses `super()`, it cooperates with whatever comes
next in the MRO:

```python
class Record:
    def __init__(self, **fields):
        self.fields = fields

    def to_dict(self):
        return dict(self.fields)

class TimestampMixin:
    def to_dict(self):
        data = super().to_dict()
        data["exported_at"] = "2026-09-25T09:00:00"
        return data

class Customer(TimestampMixin, Record):
    pass

Customer(name="Ada", tier="gold").to_dict()
```

`TimestampMixin` has no parent of its own, yet its `super().to_dict()` reaches `Record`, because in
`Customer`'s MRO `Record` comes next.

## Abstract base classes

Sometimes a parent class exists only to define what its children must do: every notifier must be
able to `send`, but there's no sensible generic way to send. Make it an **abstract base class**
with the `abc` module:

```python
from abc import ABC, abstractmethod

class Notifier(ABC):
    @abstractmethod
    def send(self, recipient, message):
        """Deliver one message."""

    def broadcast(self, recipients, message):
        return [self.send(recipient, message) for recipient in recipients]

class EmailNotifier(Notifier):
    def send(self, recipient, message):
        return f"email to {recipient}: {message}"

EmailNotifier().broadcast(["ada@example.com", "grace@example.com"], "Invoice ready")
```

`broadcast` is written once, in the base class, in terms of the abstract `send`. Python refuses to
create an instance of any class that still has an abstract method, so a subclass that forgets to
implement `send` fails immediately, not in production:

```python raises
from abc import ABC, abstractmethod

class Notifier(ABC):
    @abstractmethod
    def send(self, recipient, message):
        """Deliver one message."""

class SmsNotifier(Notifier):
    def send_sms(self, number, message):   # wrong name: send is still abstract
        return f"sms to {number}"

SmsNotifier()
```

## Where this leaves you

A subclass inherits everything and overrides what it defines. `super()` calls the next class in the
MRO of the actual object, which is how extending, mixins and diamonds all work. The MRO keeps
children before parents and parents in listed order. An abstract base class defines what subclasses
must implement and refuses to be instantiated until they do. The drills cover each of those.
