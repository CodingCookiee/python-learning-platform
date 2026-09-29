---
slug: unions-and-narrowing
title: Unions, None and Literal
summary: Say "this or that" with |, make None impossible to forget, and turn a fixed set of strings into a type.
minutes: 40
exercises:
  - types-optional-coupon
  - types-fix-none-crash
  - types-predict-mypy-verdicts
  - types-literal-order-status
  - types-typeis-parse-status
---

`find_customer(email)` returns a customer, or `None` when nobody has that email. Every caller has to
remember the `None` case, and the one that forgets crashes with
`AttributeError: 'NoneType' object has no attribute 'name'`, usually for the first real visitor who
isn't in your test data. With the right hint, forgetting becomes a mypy error instead. This lesson
covers unions, `None`, how mypy follows your checks, and `Literal` for values such as statuses.

## Unions: one of several types

`int | str` means "an int or a str". A caller may pass either, so the function has to cope with
both, and mypy won't let you use a `str` method until you've checked that you have a `str`:

```python norun
def format_amount(amount: int | str) -> str:
    return amount.strip()
```

```text
billing.py:2: error: Item "int" of "int | str" has no attribute "strip"  [union-attr]
```

An `isinstance` check tells mypy which one you have in each branch:

```python
def format_amount(amount: int | str) -> str:
    """Cents as an int, or text that's already formatted."""
    if isinstance(amount, str):
        return amount.strip()
    return f"{amount / 100:.2f}"


format_amount(1250), format_amount(" 12.50 ")
```

A union can have any number of members (`int | str | None`), and `|` works at runtime too:
`isinstance(amount, int | str)` is valid Python.

## Optional means "or None"

The most common union is "a value or nothing": `Customer | None`. Older code spells it
`Optional[Customer]` (from `typing`), which means exactly the same thing.

```python
from dataclasses import dataclass


@dataclass
class Customer:
    email: str
    name: str


CUSTOMERS = {"ada@example.com": Customer("ada@example.com", "Ada")}


def find_customer(email: str) -> Customer | None:
    return CUSTOMERS.get(email)


find_customer("ada@example.com"), find_customer("new@example.com")
```

`dict.get` returns `None` for a missing key, and the return type says so honestly. Now watch
mypy catch the caller that forgets:

```python norun
def greeting(email: str) -> str:
    customer = find_customer(email)
    return f"Hello {customer.name}"
```

```text
billing.py:19: error: Item "None" of "Customer | None" has no attribute "name"  [union-attr]
```

That's the whole point of the hint: the crash that would have happened in production is now a line
number.

> [!WARNING]
> "Optional" doesn't mean the argument can be left out. `def ship(order_id: str, note: str | None)`
> still needs two arguments; `None` is just an allowed value. A parameter can be omitted only when it
> has a default, so an optional argument is `note: str | None = None`.

## Narrowing: mypy follows your checks

Inside an `if`, mypy **narrows** a union to the types that can still be there. After
`if customer is None: return ...`, the rest of the function can only be reached with a `Customer`:

```python norun
def greeting(email: str) -> str:
    customer = find_customer(email)
    reveal_type(customer)
    if customer is None:
        return "Hello there"
    reveal_type(customer)
    return f"Hello {customer.name}"
```

```text
billing.py:16: note: Revealed type is "billing.Customer | None"
billing.py:19: note: Revealed type is "billing.Customer"
```

mypy narrows on the checks you'd write anyway:

| Check | Narrows to |
|-------|------------|
| `if x is None:` / `if x is not None:` | `None`, or everything else |
| `if isinstance(x, str):` | `str` in the branch, the rest of the union in `else` |
| `if x:` | removes `None` (and any other value that's always falsy) |
| An early `return` or `raise` | the rest of the function |
| `assert x is not None` | the lines after the assert |

```python
from dataclasses import dataclass


@dataclass
class Customer:
    email: str
    name: str


CUSTOMERS = {"ada@example.com": Customer("ada@example.com", "Ada")}


def find_customer(email: str) -> Customer | None:
    return CUSTOMERS.get(email)


def greeting(email: str) -> str:
    customer = find_customer(email)
    if customer is None:
        return "Hello there"
    return f"Hello {customer.name}"


greeting("ada@example.com"), greeting("new@example.com")
```

A condition narrows only when it guarantees the type. `if isinstance(email, str) or retry:` can be
true while `email` is still `None`, so after it mypy knows nothing new.

> [!WARNING]
> `if points:` treats `0` exactly like `None`. When zero or an empty string is a real value, write
> `if points is not None:` so that only `None` is ruled out.

```quiz
question: "`coupon` is `str | None`. After which line may you call `coupon.upper()` without a mypy error?"
options:
  - "if coupon is not None or len(CART) > 0:"
  - "if coupon == \"\":"
  - "if coupon:"
answer: 2
explain: "`if coupon:` is false for None, so inside it coupon must be a str. The first condition can be true while coupon is None, and comparing with \"\" doesn't exclude None."
```

## Literal: a fixed set of values

Order statuses, currency codes and event names are strings, but not just any string. `Literal`
lists the exact values allowed, and a name for it keeps signatures readable:

```python
from typing import Literal

PaymentStatus = Literal["pending", "paid", "refunded"]


def set_status(order_id: str, status: PaymentStatus) -> None:
    print(order_id, status)


set_status("A1042", "paid")
set_status("A1042", "piad")
```

Both calls run, because at runtime they're plain strings. mypy spots the typo:

```text
billing.py:11: error: Argument 2 to "set_status" has incompatible type "Literal['piad']"; expected "Literal['pending', 'paid', 'refunded']"  [arg-type]
```

`Literal` works for ints, bools and enum members too (`Literal[1, 2, 3]`). An `Enum` from module 4 is
the alternative when the values need behaviour or you want `PaymentStatus.PAID` spelled out; a
`Literal` is lighter when the values arrive as strings from JSON.

> [!JS]
> Coming from TypeScript: this is `type PaymentStatus = "pending" | "paid" | "refunded"`, and mypy
> narrows it the same way TypeScript narrows a string-literal union.

## Checking every case with assert_never

When you `match` on a `Literal`, mypy narrows the value as each case removes one possibility. If
every case is handled, nothing is left, and the type of "nothing" is `Never`. `assert_never(value)`
accepts only `Never`, so calling it after the last case asks mypy to prove that no case is missing:

```python norun
from typing import Literal, assert_never

PaymentStatus = Literal["pending", "paid", "refunded"]


def status_label(status: PaymentStatus) -> str:
    match status:
        case "pending":
            return "Awaiting payment"
        case "paid":
            return "Paid"
        case _:
            assert_never(status)
```

```text
billing.py:13: error: Argument 1 to "assert_never" has incompatible type "Literal['refunded']"; expected "Never"  [arg-type]
```

mypy names the case you forgot. Add it and the error goes. At runtime `assert_never` raises
`AssertionError` if it's ever reached, which can only happen if someone ignored mypy:

```python
from typing import Literal, assert_never

PaymentStatus = Literal["pending", "paid", "refunded"]


def status_label(status: PaymentStatus) -> str:
    match status:
        case "pending":
            return "Awaiting payment"
        case "paid":
            return "Paid"
        case "refunded":
            return "Refunded"
        case _:
            assert_never(status)


[status_label(s) for s in ("pending", "paid", "refunded")]
```

> [!TIP]
> This is how a typed codebase grows safely: add `"disputed"` to `PaymentStatus`, run mypy, and it
> lists every `match` that needs a new case.

## Your own narrowing checks with TypeIs

Text from a CSV or a query string is a plain `str`. Checking it against the allowed values works at
runtime, but mypy doesn't treat `raw in STATUSES` as a check on the type of `raw`:

```python norun
from typing import Literal

PaymentStatus = Literal["pending", "paid", "refunded"]
STATUSES: tuple[PaymentStatus, ...] = ("pending", "paid", "refunded")


def parse_status(raw: str) -> PaymentStatus:
    if raw in STATUSES:
        return raw
    raise ValueError(f"unknown status: {raw!r}")
```

```text
billing.py:9: error: Incompatible return value type (got "str", expected "Literal['pending', 'paid', 'refunded']")  [return-value]
```

Neither does `raw == "paid"`. A function returning `TypeIs[PaymentStatus]` is a check you write
yourself and mypy trusts: wherever it returns `True`, the argument is narrowed to `PaymentStatus`,
and wherever it returns `False`, it isn't one.

```python
from typing import Literal, TypeIs

PaymentStatus = Literal["pending", "paid", "refunded"]
STATUSES: tuple[PaymentStatus, ...] = ("pending", "paid", "refunded")


def is_status(value: str) -> TypeIs[PaymentStatus]:
    return value in STATUSES


def parse_status(raw: str) -> PaymentStatus:
    if is_status(raw):
        return raw
    raise ValueError(f"unknown status: {raw!r}")


parse_status("paid")
```

mypy doesn't verify the body of a `TypeIs` function, so it has to be right: a wrong check is a lie
that mypy believes everywhere. `TypeIs` is new in Python 3.13. Older code uses `TypeGuard`, which
narrows only where it returns `True` (never in the `else` branch); it's still useful when the
narrowed type isn't a subtype of the input, such as `list[object]` to `list[str]`.

## Where this leaves you

`X | Y` is a union and `X | None` is how "might be missing" is written. mypy narrows a union through
`is None`, `isinstance`, truthiness, early returns and `match`, and refuses anything that could still
be `None`. `Literal` turns a fixed set of values into a type, `assert_never` proves a `match` covers
them all, and `TypeIs` lets your own validation function narrow a `str` into one. The drills end
with a CSV export parsed into statuses mypy trusts.
