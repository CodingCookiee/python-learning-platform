---
slug: classmethods-and-properties
title: Class methods, static methods and properties
summary: Alternative constructors with @classmethod, helpers with @staticmethod, and attributes that validate themselves with @property.
minutes: 35
exercises:
  - oop-order-total-property
  - oop-money-from-string
  - oop-product-price-validation
  - oop-getters-to-property
  - oop-shipment-from-json
---

Real data arrives in many shapes: a price as `"12.50 EUR"` from a CSV, as `1250` cents from a
payment API, as a dict from JSON. A class has only one `__init__`, and cramming every shape into it
makes a mess. And once an object exists, something has to stop `product.price = -5` from quietly
succeeding. Python has a decorator for each of these jobs.

## A method that receives the class

A normal method receives the instance as `self`. Put `@classmethod` above a method and it receives
the **class** instead, conventionally named `cls`. You can call it on the class, before any
instance exists:

```python
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    @classmethod
    def from_string(cls, text):
        amount, currency = text.split()
        return cls(float(amount), currency)

    @classmethod
    def from_cents(cls, cents, currency):
        return cls(cents / 100, currency)

price = Money.from_string("12.50 EUR")
refund = Money.from_cents(1250, "EUR")
price.amount, price.currency, refund.amount
```

These are **alternative constructors**: each one parses its input shape and then calls the one real
constructor, `cls(...)`. You've already used some: `dict.fromkeys(...)` and
`datetime.fromisoformat(...)` are class methods on built-in types.

## Why cls and not the class name

`cls(...)` could have been `Money(...)`, and in this class it would work the same. The difference
shows up with inheritance (lesson 5 covers it properly): a subclass inherits the class method, and
`cls` is whichever class it was called on.

```python
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    @classmethod
    def from_string(cls, text):
        amount, currency = text.split()
        return cls(float(amount), currency)

class Price(Money):     # a Price is a kind of Money
    pass

type(Price.from_string("9.99 GBP"))
```

With `Money(...)` hard-coded, `Price.from_string` would have built a plain `Money`. Always build
with `cls`.

## Static methods are plain functions in a class

`@staticmethod` removes the automatic first argument entirely: no `self`, no `cls`. It's an ordinary
function that lives in the class's namespace because it belongs with the class conceptually.

```python
class Money:
    @staticmethod
    def is_currency_code(code):
        return len(code) == 3 and code.isalpha() and code.isupper()

Money.is_currency_code("EUR"), Money.is_currency_code("euro")
```

Use one when a helper needs neither the instance nor the class. If it doesn't even belong with the
class, a module-level function is simpler and just as good.

```quiz
question: A method builds an Invoice from a dict read from JSON. Which decorator fits?
options:
  - "None: a regular method with self"
  - "@classmethod"
  - "@staticmethod"
answer: 1
explain: There's no instance yet, and it has to construct one. A class method receives cls and returns cls(...), which also does the right thing for subclasses.
```

## Properties: computed attributes

Some values are derived from others. An order's total is the sum of its lines, and storing it
separately means it can go stale. A **property** is a method that's read like an attribute:

```python
class Order:
    def __init__(self, lines):
        self.lines = lines       # (product, quantity, unit price)

    @property
    def total(self):
        return sum(quantity * price for _, quantity, price in self.lines)

order = Order([("Coffee beans", 2, 12.5), ("Mug", 1, 8.0)])
order.total
```

No parentheses: `order.total`, not `order.total()`. It's recomputed on every read, so it's always
right. A property without a setter is **read-only**:

```python raises
class Order:
    def __init__(self, lines):
        self.lines = lines

    @property
    def total(self):
        return sum(quantity * price for _, quantity, price in self.lines)

order = Order([("Mug", 1, 8.0)])
order.total = 0
```

## Validation with a setter

Here's the wrong way first. Checking the price in `__init__` protects creation, and nothing else:

```python
class Product:
    def __init__(self, name, price):
        if price < 0:
            raise ValueError("Price can't be negative")
        self.name = name
        self.price = price

mug = Product("Mug", 8.0)
mug.price = -5       # sails straight through
mug.price
```

A property with a **setter** runs your check on every assignment. The real value lives in an
underscored attribute, and `__init__` assigns through the property so creation is checked too:

```python
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price           # goes through the setter below

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        if value < 0:
            raise ValueError("Price can't be negative")
        self._price = round(value, 2)

mug = Product("Mug", 8.004)
mug.price = 7.5
mug.price
```

```python raises
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        if value < 0:
            raise ValueError("Price can't be negative")
        self._price = round(value, 2)

mug = Product("Mug", 8.0)
mug.price = -5
```

> [!JS]
> Coming from JavaScript: this is `get price()` and `set price(v)` in a class. The decorator
> `@price.setter` pairs the setter with the getter of the same name.

> [!WARNING]
> Inside the property, use `self._price`, never `self.price`. Reading `self.price` in the getter
> calls the getter again, forever, until Python gives up with `RecursionError`.

## Start with plain attributes

Coming from Java or C#, it's tempting to write `get_price()` and `set_price()` for everything. Don't.
In Python, start with a plain attribute. If you later need validation or a computed value, turn it
into a property: callers still write `product.price` and `product.price = 9`, so nothing that uses
the class has to change.

```python
class Customer:
    def __init__(self, name, email):
        self.name = name        # plain attributes are the default
        self.email = email

ada = Customer("Ada", "ada@example.com")
ada.email = "ada@newdomain.com"
ada.email
```

> [!TIP]
> `@property` is how the data model in module 11 introduces descriptors: `property` itself is a
> class, and understanding how it works explains most of Python's attribute machinery.

## Where this leaves you

`@classmethod` receives the class and is the idiomatic way to write alternative constructors, built
with `cls(...)`. `@staticmethod` is a plain function kept in the class. `@property` makes a method
read like an attribute, and a setter validates every assignment. The drills put each one to work.
