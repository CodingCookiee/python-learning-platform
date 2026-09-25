---
slug: classes-and-self
title: Classes, instances and self
summary: A class is a factory for objects, and self is simply the instance, passed to every method explicitly.
minutes: 35
exercises:
  - oop-shipment-label
  - oop-forgot-self
  - oop-predict-bound-method
  - oop-bank-account
  - oop-account-statement
---

So far your data has lived in dicts and lists, and your behaviour in functions that take them as
arguments. That works until the two drift apart: a `deposit(account, amount)` function that
someone forgets to call, or an account dict that someone edits by hand. A **class** keeps the data
and the functions that are allowed to change it in one place.

## A class makes instances

A `class` statement creates a new type. Calling the class, like a function, creates an **instance**
of it: a new object of that type.

```python
class Shipment:
    pass

first = Shipment()
second = Shipment()

type(first), first is second, isinstance(first, Shipment)
```

Each call builds a separate object. You can attach attributes to an instance with a dot, and each
instance keeps its own:

```python
class Shipment:
    pass

parcel = Shipment()
parcel.tracking = "RA123456785GB"
parcel.weight_kg = 2.5

letter = Shipment()
letter.tracking = "RB987654321GB"

parcel.tracking, letter.tracking, vars(parcel)
```

`vars(obj)` shows an instance's own attributes. They're stored in a plain dict, `obj.__dict__`,
which is why you can add them at any time. Setting them by hand after creation is fragile, though:
nothing stops `letter` from having no `weight_kg` at all. That's what `__init__` is for.

## `__init__` sets up each instance

When you call `Shipment(...)`, Python creates an empty instance and then calls the class's
`__init__` method on it with your arguments. Whatever `__init__` assigns becomes the instance's
starting state.

```python
class Shipment:
    def __init__(self, tracking, weight_kg):
        self.tracking = tracking
        self.weight_kg = weight_kg

parcel = Shipment("RA123456785GB", 2.5)
parcel.tracking, parcel.weight_kg
```

`__init__` doesn't create the object and doesn't return anything: by the time it runs, the object
exists, and its job is to fill it in. (The double underscores mark a name Python calls for you.
You'll meet several more of these "dunder" methods in this module.)

> [!JS]
> Coming from JavaScript: `__init__` plays the role of `constructor`, and there's no `new`. You call
> the class directly, `Shipment("RA1", 2.5)`, and every attribute is assigned through `self.`,
> never declared in the class body.

## self is the instance, passed explicitly

A method is a function defined inside a class. Its first parameter, by convention named `self`,
receives the instance the method was called on:

```python
class Shipment:
    def __init__(self, tracking, weight_kg):
        self.tracking = tracking
        self.weight_kg = weight_kg

    def label(self):
        return f"{self.tracking} ({self.weight_kg} kg)"

parcel = Shipment("RA123456785GB", 2.5)

# These two lines do exactly the same thing
parcel.label(), Shipment.label(parcel)
```

That second form is the whole secret. `parcel.label()` is shorthand: Python looks up `label` on the
class and calls it with `parcel` as the first argument. There's no hidden magic variable; `self` is
an ordinary parameter, and the name is only a convention (a very strong one: always use it).

So the rule inside a method is simple: **the instance's data is always reached through `self.`**. A
bare name is a local variable, exactly as in any other function.

> [!JS]
> Coming from JavaScript: `self` isn't bound by how you call a method, the way `this` is. You can
> pass `parcel.label` around as a callback and it still remembers `parcel`; there's no `.bind()`
> and no lost-`this` bug.

## Forgetting self, the two classic ways

Both of these mistakes are easy to make and produce confusing errors, so it's worth seeing them once.

Forgetting `self.` on an assignment creates a local variable that vanishes when `__init__` returns:

```python raises
class Cart:
    def __init__(self, owner):
        owner = owner          # a local variable, not an attribute

cart = Cart("Ada")
cart.owner
```

Forgetting `self` in the parameter list means the instance Python passes in has nowhere to go:

```python raises
class Cart:
    def __init__(self, owner):
        self.owner = owner

    def greet():
        return "Hello"

Cart("Ada").greet()
```

"takes 0 positional arguments but 1 was given" is Python telling you it passed the instance and the
method didn't expect it. Whenever you see a method called with one argument more than you wrote,
think of `self`.

```quiz
question: "Given `cart = Cart(\"Ada\")`, what is `cart.add(\"mug\")` equivalent to?"
options:
  - "Cart.add(\"mug\")"
  - "Cart.add(cart, \"mug\")"
  - "cart.add(cart, \"mug\")"
answer: 1
explain: Python finds add on the class and passes the instance as the first argument, so self is cart and the next parameter is "mug".
```

## Methods that change state

Methods are how an object's data changes. Keeping the rules inside the class means every caller
gets them for free: a deposit can't be negative, whoever makes it.

```python
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("Deposits must be positive")
        self.balance += amount
        return self.balance

savings = BankAccount("Grace")
savings.deposit(120)
savings.deposit(30)
savings.balance
```

`raise ValueError("...")` stops the method and reports the problem to the caller, the same way
`int("abc")` does. Module 6 covers exceptions in depth; for now, raising `ValueError` for bad input
is all you need.

```python raises
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("Deposits must be positive")
        self.balance += amount
        return self.balance

BankAccount("Grace").deposit(-50)
```

## Private by convention

Python has no `private` keyword. A leading underscore says "internal, don't touch from outside",
and every Python developer respects it, but nothing enforces it.

```python
class BankAccount:
    def __init__(self, owner):
        self.owner = owner
        self._transactions = []   # internal detail: use deposit() instead

    def deposit(self, amount):
        self._transactions.append(amount)

    def balance(self):
        return sum(self._transactions)

account = BankAccount("Ada")
account.deposit(100)
account.deposit(25)
account.balance()
```

Callers use `deposit()` and `balance()`; how the class stores things is its own business and can
change later without breaking them.

> [!JS]
> Coming from JavaScript: there's no equivalent of `#private` fields that the language enforces.
> `_name` is a promise between developers, and that's considered enough.

> [!TIP]
> Name classes in `CapWords` (`BankAccount`, `Shipment`) and methods and attributes in
> `snake_case`. A class name is usually a noun; a method name is usually a verb.

## Where this leaves you

A class bundles data with the methods allowed to change it. Calling the class makes an instance and
runs `__init__` on it. Inside every method, `self` is the instance, passed in explicitly, and
`obj.method(x)` is just `Class.method(obj, x)`. The drills have you build classes, repair the two
forgotten-`self` bugs, and predict what a method call really does.
