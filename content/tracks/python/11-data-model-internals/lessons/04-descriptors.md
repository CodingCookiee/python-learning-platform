---
slug: descriptors
title: Descriptors and slots
summary: The protocol behind property, methods, classmethod and __slots__, and how to write your own reusable attributes.
minutes: 45
exercises:
  - desc-table-name
  - desc-predict-precedence
  - desc-properties-to-descriptor
  - desc-cached-attribute
  - desc-slots-fix
  - desc-rebuild-property
---

Module 5 validated a product's price with `@property`. Now the product also has a weight and a
stock level, and each needs the same "must be positive" rule:

```python
class Product:
    def __init__(self, price, weight):
        self.price = price
        self.weight = weight

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        if value <= 0:
            raise ValueError("price must be positive")
        self._price = value

    # ...and the same nine lines again for weight, and again for stock

Product(8.50, 0.35).price
```

Nine lines per field, identical except for the name. The fix is to write the rule once, as an
object that manages an attribute. That object is a **descriptor**, and it's also the mechanism
behind `property`, methods, `classmethod` and `__slots__`. Lesson 3 left one step out of attribute
lookup; this is it.

## A descriptor is an object on the class

A descriptor is any object whose class defines `__get__`. Put one in a class body, and reading
that attribute calls the descriptor's `__get__(instance, owner)` instead of returning the object:

```python
class WithVat:
    def __get__(self, instance, owner):
        print(f"  __get__(instance={instance!r}, owner={owner.__name__})")
        if instance is None:
            return self                    # read on the class itself
        return round(instance.net * 1.2, 2)

class InvoiceLine:
    gross = WithVat()

    def __init__(self, net):
        self.net = net

    def __repr__(self):
        return f"InvoiceLine({self.net})"

line = InvoiceLine(40)
print(line.gross)
print(InvoiceLine.gross)
```

Through an instance, `instance` is that instance and `owner` its class. Through the class,
`instance` is `None`; returning the descriptor itself then is the convention, so tools like
`help()` can find it.

## `__set__` and `__set_name__`

Define `__set__(instance, value)` as well and assignment goes through the descriptor too. There's
one catch: a descriptor lives on the class and is shared by every instance, so it must store each
instance's value **on the instance**, and for that it needs to know its own attribute name. Python
tells it: when the class is created, it calls `__set_name__(owner, name)` on every descriptor in
the class body.

```python
class Positive:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__[self.name]

    def __set__(self, instance, value):
        if value <= 0:
            raise ValueError(f"{self.name} must be positive, got {value}")
        instance.__dict__[self.name] = value

class Product:
    price = Positive()
    weight = Positive()
    stock = Positive()

    def __init__(self, sku, price, weight, stock):
        self.sku = sku
        self.price = price        # goes through Positive.__set__
        self.weight = weight
        self.stock = stock

mug = Product("MUG-01", 8.50, 0.35, 40)
try:
    mug.weight = 0
except ValueError as error:
    print(error)

mug.price, vars(mug), Product.weight.name
```

The rule is written once and used three times, and each error message names the right field. The
value lives in the instance's `__dict__` under the attribute's own name, which raises a question:
if the instance dict is checked first, why doesn't `mug.price` just read the dict and skip
`__get__`?

## Data and non-data descriptors

Because descriptors come in two kinds, with different priorities:

- A **data descriptor** defines `__set__` or `__delete__`. It beats the instance dict.
- A **non-data descriptor** defines only `__get__`. The instance dict beats it.

So here is the full algorithm that `object.__getattribute__` runs for `obj.name`:

1. Look `name` up in the classes of `type(obj).__mro__`. If it's a **data descriptor**, return
   `descriptor.__get__(obj, type(obj))`.
2. Otherwise, if `name` is in `obj.__dict__`, return that.
3. Otherwise, if the class had it: call `__get__` if it's a non-data descriptor, or return it as is.
4. Otherwise, call `__getattr__` if there is one, or raise `AttributeError`.

```python
class Locked:
    def __get__(self, instance, owner):
        return "data descriptor"

    def __set__(self, instance, value):
        raise AttributeError("locked")

class Suggested:
    def __get__(self, instance, owner):
        return "non-data descriptor"

class Report:
    title = Locked()
    footer = Suggested()

report = Report()
report.__dict__.update(title="instance dict", footer="instance dict")

report.title, report.footer
```

`Positive` is a data descriptor, which is why it could safely keep the value under the same name.

```quiz
question: "A class has a descriptor `total` with `__get__` only, and an instance has `total` in its `__dict__`. What does `obj.total` return?"
options:
  - "The result of the descriptor's __get__"
  - "The value in the instance dict"
  - "It raises AttributeError"
answer: 1
explain: "With only __get__, it's a non-data descriptor, so the instance dict wins. Add __set__ and it becomes a data descriptor that beats the dict."
```

> [!JS]
> Coming from JavaScript: `Object.defineProperty(obj, "price", { get, set })` attaches accessors to
> one object. A descriptor is written once on the class and serves every instance, much like a
> getter defined on a prototype.

## `property` is a data descriptor

`property` is a class, and `@property` creates an instance of it holding your getter (and setter)
functions. It defines `__get__`, `__set__` and `__delete__`:

```python
class Invoice:
    def __init__(self, net):
        self.net = net

    @property
    def total(self):
        return round(self.net * 1.2, 2)

raw = vars(Invoice)["total"]
type(raw), raw.fget, hasattr(raw, "__set__"), raw.__get__(Invoice(100), Invoice)
```

Even a read-only property has `__set__`; it raises `AttributeError`. That makes every property a
data descriptor, which is exactly why `invoice.total = 5` is refused instead of quietly creating an
instance attribute that hides the property.

## Methods are non-data descriptors

Here's the step lesson 3 left out. Plain functions have a `__get__` method, so every function in a
class body is a non-data descriptor, and `__get__` is what turns it into a **bound method**:

```python
class Invoice:
    def __init__(self, net):
        self.net = net

    def with_vat(self):
        return round(self.net * 1.2, 2)

inv = Invoice(100)
function = vars(Invoice)["with_vat"]
bound = function.__get__(inv, Invoice)

bound, bound(), bound.__self__ is inv, bound.__func__ is function
```

`inv.with_vat` does exactly that: finds a function on the class, calls its `__get__`, and gets a
method object that remembers `inv` and passes it as `self`. Because functions are non-data, an
instance attribute can shadow a method, as you saw in lesson 3. `classmethod` and `staticmethod`
are descriptors too: `classmethod.__get__` binds the function to the class instead of the
instance, and `staticmethod.__get__` returns the plain function.

That also settles module 8's warning about decorators written as classes. An instance of your
decorator class has no `__get__`, so it never binds `self`. Give it one and it works on methods:

```python
import functools
import types

class count_calls:
    def __init__(self, func):
        functools.update_wrapper(self, func)
        self.func = func
        self.calls = 0

    def __call__(self, *args, **kwargs):
        self.calls += 1
        return self.func(*args, **kwargs)

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return types.MethodType(self, instance)     # bind like a function does

class Invoice:
    def __init__(self, net):
        self.net = net

    @count_calls
    def with_vat(self):
        return round(self.net * 1.2, 2)

inv = Invoice(100)
inv.with_vat(), inv.with_vat(), Invoice.with_vat.calls
```

## `__slots__`: attributes without a `__dict__`

A class that lists its attributes in `__slots__` gets no per-instance `__dict__`. Instead, Python
reserves a fixed place for each attribute inside the object and puts a data descriptor for each
one on the class:

```python
class Tick:
    __slots__ = ("symbol", "price")

    def __init__(self, symbol, price):
        self.symbol = symbol
        self.price = price

tick = Tick("ACME", 101.25)
type(vars(Tick)["price"]).__name__, hasattr(tick, "__dict__"), tick.price
```

Without a dict, there's nowhere to put an attribute that isn't in the list, so a typo fails
loudly:

```python raises
class Tick:
    __slots__ = ("symbol", "price")

    def __init__(self, symbol, price):
        self.symbol = symbol
        self.price = price

tick = Tick("ACME", 101.25)
tick.prcie = 99.0
```

The trade-offs, all of which follow from "no `__dict__`":

- **Less memory, slightly faster access.** It matters when you have millions of small objects;
  lesson 7 measures it.
- **No new attributes**, which also rules out tools that stash things in the instance dict, such
  as `functools.cached_property`.
- **No class attribute with the same name as a slot.** The class attribute would replace the slot's
  descriptor, so Python refuses the class; set defaults in `__init__` instead.
- **No weak references** (lesson 7) unless you add `"__weakref__"` to the slots.
- **Subclasses get a `__dict__` back** unless they declare `__slots__` too, listing only their new
  attributes.

```python
class Tick:
    __slots__ = ("symbol", "price")

class TradeTick(Tick):          # no __slots__ here
    pass

class QuoteTick(Tick):
    __slots__ = ("bid", "ask")  # only the new ones

hasattr(TradeTick(), "__dict__"), hasattr(QuoteTick(), "__dict__")
```

`@dataclass(slots=True)` from module 5 writes `__slots__` for you, and moves any defaults into
`__init__` so the name clash never happens.

## Where this leaves you

A descriptor is an object on a class whose `__get__`, and optionally `__set__` and `__delete__`,
run when the attribute is used; `__set_name__` tells it its name. Data descriptors beat the
instance dict and non-data descriptors lose to it, which completes the lookup algorithm.
`property` is a data descriptor, functions are non-data descriptors whose `__get__` makes bound
methods, and `__slots__` replaces the instance dict with one descriptor per attribute. The drills
have you write descriptors, refactor properties into one, fix a slotted class, and rebuild
`property` itself.
