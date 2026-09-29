---
slug: protocols-and-overloads
title: Protocols and overloads
summary: Type things by what they can do rather than what they inherit from, and give one function several precise signatures.
minutes: 45
exercises:
  - protocol-shipping-carrier
  - protocol-predict-runtime-checkable
  - protocol-refactor-abc
  - protocol-cheapest-by-price
  - protocol-overload-setting
---

Your checkout supports two payment providers. Each comes from its provider's SDK, and each has a
`refund(payment_id, amount_cents)` method. In module 5 you'd have written an abstract base class,
`class Refunder(ABC)`, but a class from someone else's package can't inherit from your ABC, so you'd
end up writing an adapter class per provider just to forward one method call. A **Protocol** types a
value by what it can do instead of by its ancestors. This lesson covers protocols, checking them at
runtime, typing callbacks, and `@overload` for functions whose return type depends on how they're
called.

## Structural typing with Protocol

An ABC is **nominal**: a class counts as a `Refunder` only if it says so, by inheriting. A
`Protocol` is **structural**: any class with matching methods counts, whether or not it has heard of
the protocol.

```python
from typing import Protocol


class Refunder(Protocol):
    def refund(self, payment_id: str, amount_cents: int) -> str: ...


class CardGateway:
    def refund(self, payment_id: str, amount_cents: int) -> str:
        return f"card refund {payment_id} {amount_cents}"


class BankTransfer:
    def refund(self, payment_id: str, amount_cents: int) -> str:
        return f"bank refund {payment_id} {amount_cents}"


def refund_all(gateway: Refunder, payment_ids: list[str], amount_cents: int) -> list[str]:
    return [gateway.refund(payment_id, amount_cents) for payment_id in payment_ids]


refund_all(CardGateway(), ["pay_1", "pay_2"], 500), refund_all(BankTransfer(), ["pay_3"], 500)
```

Neither gateway mentions `Refunder`. mypy compares their `refund` methods with the protocol's and
finds they match. A class whose method has a different signature doesn't, and the error says
exactly how:

```python norun
class GiftCardLedger:
    def refund(self, payment_id: str) -> str:
        return f"store credit {payment_id}"


refund_all(GiftCardLedger(), ["pay_3"], 500)
```

```text
billing.py:29: error: Argument 1 to "refund_all" has incompatible type "GiftCardLedger"; expected "Refunder"  [arg-type]
billing.py:29: note: Following member(s) of "GiftCardLedger" have conflicts:
billing.py:29: note:     Expected:
billing.py:29: note:         def refund(self, payment_id: str, amount_cents: int) -> str
billing.py:29: note:     Got:
billing.py:29: note:         def refund(self, payment_id: str) -> str
```

The protocol's method bodies are `...`: a protocol only describes. You never instantiate one, and
you don't need to inherit from it, though you may (a class that does gets checked against the
protocol where it's defined, not only where it's used).

> [!JS]
> Coming from TypeScript: this is exactly how an `interface` works. TypeScript is structural
> everywhere; Python is nominal by default (`isinstance`, ABCs) and structural where you ask for it
> with `Protocol`.

## What a protocol can require

Besides methods, a protocol can list attributes. `name: str` requires an attribute you can read
**and assign**, and a property requires one you can only read:

```python
from dataclasses import dataclass
from typing import Protocol


class Priced(Protocol):
    @property
    def price_cents(self) -> int: ...


@dataclass(frozen=True)
class Product:
    name: str
    price_cents: int


class ShippingOption:
    def __init__(self, label: str, base_cents: int, surcharge_cents: int) -> None:
        self.label = label
        self.base_cents = base_cents
        self.surcharge_cents = surcharge_cents

    @property
    def price_cents(self) -> int:
        return self.base_cents + self.surcharge_cents


def total_price(items: list[Priced]) -> int:
    return sum(item.price_cents for item in items)


total_price([Product("Mug", 800), ShippingOption("Next day", 599, 200)])
```

A frozen dataclass field, a plain attribute and a property all satisfy a read-only property in a
protocol. The reverse isn't true. A protocol `Named` that says `name: str` promises callers they can
assign to `name`, so passing it the frozen `Product` fails:

```text
billing.py:38: error: Argument 1 to "shout" has incompatible type "Product"; expected "Named"  [arg-type]
billing.py:38: note: Protocol member Named.name expected settable variable, got read-only attribute
```

> [!TIP]
> Declare protocol attributes as read-only properties unless callers really need to assign them.
> It's the smaller promise, so more classes fit it.

## Protocols as bounds

A protocol works as a type parameter's bound, which is how you write "anything priced, and give me
back the same type":

```python norun
from collections.abc import Iterable


def cheapest[T: Priced](items: Iterable[T]) -> T:
    return min(items, key=lambda item: item.price_cents)


reveal_type(cheapest([Product("Mug", 800), Product("Beans", 2450)]))
cheapest([800, 2450])
```

```text
billing.py:35: note: Revealed type is "billing.Product"
billing.py:37: error: Value of type variable "T" of "cheapest" cannot be "int"  [type-var]
```

You've been using protocols all along. `Iterable`, `Sized`, `Hashable` and friends in
`collections.abc` are checked structurally by mypy, which is why any class with `__iter__` is an
`Iterable` and any class with `__len__` is accepted by `len()`. Module 11 builds classes on exactly
these protocols.

```quiz
question: "A protocol says `name: str`. Which class satisfies it?"
options:
  - "A frozen dataclass with a name: str field"
  - "A class that sets self.name = \"Royal Mail\" in __init__"
  - "A class with a read-only name property"
answer: 1
explain: "name: str in a protocol is a settable attribute. An ordinary instance attribute can be assigned, so it fits. The frozen field and the property are read-only, so mypy rejects them; to accept those, declare name as a property in the protocol."
```

## Checking a protocol at runtime

`isinstance` refuses a plain protocol, because a protocol is a type for mypy:

```python raises
from typing import Protocol


class Refunder(Protocol):
    def refund(self, payment_id: str, amount_cents: int) -> str: ...


isinstance("pay_1", Refunder)
```

Decorating it with `@runtime_checkable` makes `isinstance` work, but read what it checks: only that
each member **exists**. It never looks at parameters or return types.

```python
from typing import Protocol, runtime_checkable


@runtime_checkable
class Refunder(Protocol):
    def refund(self, payment_id: str, amount_cents: int) -> str: ...


class GiftCardLedger:
    def refund(self, payment_id: str) -> str:
        return f"store credit {payment_id}"


isinstance(GiftCardLedger(), Refunder), isinstance("pay_1", Refunder)
```

> [!WARNING]
> `isinstance(x, SomeProtocol)` being `True` doesn't mean `x` fits the protocol, only that it has
> attributes with the right names. Use it to choose between shapes at runtime, and rely on mypy for
> the signatures.

## Callback protocols

`Callable[[int, str], int]` describes positional parameters only. It can't say "a keyword-only
argument called `customer_tier`". A protocol with a `__call__` method can, because anything callable
with that signature fits it, including a plain function:

```python
from typing import Protocol


class PriceRule(Protocol):
    def __call__(self, subtotal_cents: int, *, customer_tier: str) -> int: ...


def vip_discount(subtotal_cents: int, *, customer_tier: str) -> int:
    return subtotal_cents // 10 if customer_tier == "vip" else 0


def apply_rules(subtotal_cents: int, tier: str, rules: list[PriceRule]) -> int:
    return subtotal_cents - sum(rule(subtotal_cents, customer_tier=tier) for rule in rules)


apply_rules(5000, "vip", [vip_discount]), apply_rules(5000, "standard", [vip_discount])
```

A rule whose keyword is spelled `tier` instead of `customer_tier` would crash when called. mypy
rejects it when it's added to the list:

```text
billing.py:21: error: List item 0 has incompatible type "def bulk_discount(subtotal_cents: int, *, tier: str) -> int"; expected "PriceRule"  [list-item]
```

## Overloads: when the return type depends on the call

A settings helper returns the value or a default. With one signature, the return type has to cover
every case, so a caller who passed a default still gets `str | None` and has to narrow a `None` that
can't happen:

```python norun
from collections.abc import Mapping


def get_setting(env: Mapping[str, str], name: str, default: str | None = None) -> str | None:
    return env.get(name, default)


ENV = {"SHOP_CURRENCY": "EUR"}
region: str = get_setting(ENV, "SHOP_REGION", "EU")
```

```text
billing.py:9: error: Incompatible types in assignment (expression has type "str | None", variable has type "str")  [assignment]
```

`@overload` lists the signatures callers can use, each with its own return type. The stubs have `...`
bodies. The real implementation comes last, without `@overload`, and its hints must cover every
overload:

```python
from collections.abc import Mapping
from typing import get_overloads, overload


@overload
def get_setting(env: Mapping[str, str], name: str) -> str | None: ...
@overload
def get_setting(env: Mapping[str, str], name: str, default: str) -> str: ...
def get_setting(env: Mapping[str, str], name: str, default: str | None = None) -> str | None:
    return env.get(name, default)


ENV = {"SHOP_CURRENCY": "EUR"}
get_setting(ENV, "SHOP_CURRENCY"), get_setting(ENV, "SHOP_REGION", "EU"), len(get_overloads(get_setting))
```

mypy picks the first overload that matches each call:

```text
billing.py:14: note: Revealed type is "builtins.str | None"
billing.py:15: note: Revealed type is "builtins.str"
```

At runtime the stubs are thrown away: each `@overload` definition is replaced by the next, so only
the implementation runs. (`typing.get_overloads` can still list them, for tools.) Reach for
overloads when a function has a small, fixed number of call shapes with different results; when
the return type simply follows an argument's type, a type parameter is simpler.

## Where this leaves you

A `Protocol` describes what a value can do, and any class with matching methods and attributes
satisfies it without inheriting, which is how you accept code you don't own. Protocol attributes
are best declared as read-only properties, protocols work as type-parameter bounds, and
`@runtime_checkable` makes `isinstance` check names only. A `__call__` protocol types callbacks that
`Callable` can't, and `@overload` gives one function several precise signatures. The drills end with
a settings reader that returns text or an int, depending on the default it's given.
