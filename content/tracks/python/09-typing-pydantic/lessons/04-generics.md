---
slug: generics
title: Generics
summary: Write functions, classes and decorators that work for any type and still tell mypy exactly which type comes out.
minutes: 45
exercises:
  - generics-last-item
  - generics-fix-any-leak
  - generics-page-class
  - generics-audit-decorator
  - generics-retry-decorator
---

Some functions don't care what they hold: "the first item", "index these by a key", "a page of API
results". Typing them as `Any` passes mypy by switching it off, so the type information is lost the
moment it goes in, and every mistake after that goes unnoticed. **Generics** let one function or
class work for every type while keeping track of which one it was given. This lesson uses the
Python 3.12 syntax throughout, and ends with the decorator problem: how to wrap a function without
wiping out its signature.

## The problem with Any

`first` works for a list of anything, so it's tempting to write it with `Any`:

```python norun
from dataclasses import dataclass
from typing import Any


@dataclass
class Order:
    order_id: str
    total_cents: int


def first(items: list[Any]) -> Any:
    return items[0]


orders = [Order("A1042", 1600), Order("A1043", 900)]
reveal_type(first(orders))
first(orders).totl
```

```text
billing.py:16: note: Revealed type is "Any"
Success: no issues found in 1 source file
```

A list of `Order` went in and `Any` came out, so the typo on the last line passes mypy and fails at
runtime. What `first` really promises is "whatever type the items are, that's the type you get back".

## Generic functions

A **type parameter** says exactly that. Declare it in square brackets after the function's name,
then use it like any other type:

```python
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass
class Order:
    order_id: str
    total_cents: int


def first[T](items: Sequence[T]) -> T:
    return items[0]


orders = [Order("A1042", 1600), Order("A1043", 900)]
first(orders), first(("MUG-01", "BEANS-1KG")), first.__type_params__
```

mypy works out `T` separately at each call, from the argument. Asked to `reveal_type` the two calls,
and given the typo from before, it reports:

```text
billing.py:16: note: Revealed type is "billing.Order"
billing.py:17: note: Revealed type is "builtins.str"
billing.py:18: error: "Order" has no attribute "totl"  [attr-defined]
```

At runtime, `def first[T]` creates a real `TypeVar` object named `T`, scoped to that one function,
and stores it in `first.__type_params__`. Nothing else changes: the function runs exactly as it would
without the brackets.

> [!JS]
> Coming from TypeScript: `def first[T](items: Sequence[T]) -> T` is
> `function first<T>(items: readonly T[]): T`. The brackets are square and come before the
> parentheses, but the idea is identical, including inference at the call site.

> [!NOTE]
> Before Python 3.12 you declared type parameters separately, as `T = TypeVar("T")` at module level,
> and wrote `def first(items: Sequence[T]) -> T`. You'll meet that spelling in older code and
> libraries. It means the same thing.

## Functions as values: Callable

A function that takes another function, like `sorted(key=...)`, needs a type for it.
`Callable[[Order], str]` is "a callable that takes one `Order` and returns a `str`". With two type
parameters, `index_by` can connect the items, the key function and the result:

```python
from collections.abc import Callable, Iterable
from dataclasses import dataclass


@dataclass
class Order:
    order_id: str
    total_cents: int


def index_by[T, K](items: Iterable[T], key: Callable[[T], K]) -> dict[K, T]:
    return {key(item): item for item in items}


orders = [Order("A1042", 1600), Order("A1043", 900)]
index_by(orders, lambda order: order.order_id)
```

With `reveal_type` around that last call, mypy says:

```text
billing.py:16: note: Revealed type is "builtins.dict[builtins.str, billing.Order]"
```

mypy inferred `T` as `Order` from the list, checked the lambda against `Callable[[Order], K]`, and
inferred `K` as `str` from what the lambda returns. `Callable[..., str]` (with a literal `...`)
accepts any arguments; use it only when you really can't say more.

```quiz
question: "What does mypy infer for `index_by(orders, lambda order: order.total_cents > 1000)`?"
options:
  - "dict[int, Order]"
  - "dict[bool, Order]"
  - "dict[Any, Order]"
answer: 1
explain: "K is whatever the key function returns, and a comparison returns a bool. That's a valid dict, if not a very useful one: it keeps only the last order on each side of 1000."
```

## Generic classes

Put the type parameter on the class and every method can use it. A page of results from a paginated
API is the classic case: the paging logic is the same whether the page holds orders or customers.

```python
from collections.abc import Callable
from dataclasses import dataclass


@dataclass
class Page[T]:
    items: list[T]
    next_cursor: str | None = None

    def first(self) -> T | None:
        return self.items[0] if self.items else None

    def map[U](self, fn: Callable[[T], U]) -> Page[U]:
        return Page([fn(item) for item in self.items], self.next_cursor)


page = Page(["A1042", "A1043"], next_cursor="c2")
page.first(), page.map(len)
```

What mypy reveals for `page`, `page.first()` and `page.map(len)`:

```text
billing.py:18: note: Revealed type is "billing.Page[builtins.str]"
billing.py:19: note: Revealed type is "builtins.str | None"
billing.py:20: note: Revealed type is "billing.Page[builtins.int]"
```

`map` has its own type parameter `U`, because the new page's item type depends on the function
passed in. You can write `Page[Order]` in a hint to say which kind of page you mean, and mypy
rejects a mismatch such as `wrong: Page[int] = Page(["A1042"])`. The return type `Page[U]` can name
the class inside its own body because annotations are evaluated lazily.

## Bounds and constraints

An unconstrained `T` could be anything, so mypy only lets you do what works on everything. When a
function needs an attribute, give the type parameter a **bound**: `[E: Event]` means "`Event` or any
subclass of it".

```python
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Event:
    at: datetime


@dataclass
class Payment(Event):
    amount_cents: int


def latest[E: Event](events: Iterable[E]) -> E:
    return max(events, key=lambda event: event.at)


payments = [Payment(datetime(2026, 9, 1), 1600), Payment(datetime(2026, 9, 3), 900)]
latest(payments)
```

Without the bound, `event.at` is an error (`"E" has no attribute "at"`). With it, mypy allows the
attribute and still returns the precise subclass: `latest(payments)` is a `Payment`, not just an
`Event`. `latest(["2026-09-01"])` is rejected, because a `str` isn't an `Event`.

A **constraint** list, `[N: (int, Decimal)]`, is stricter: `N` must be exactly one of the listed
types. It suits arithmetic helpers, where mixing an `int` total with a `Decimal` one is a mistake.

## Generic type aliases

The `type` statement from lesson 3 takes type parameters too:

```python
type Pair[T] = tuple[T, T]
type Paginated[T] = tuple[list[T], str | None]


def price_range(prices: list[int]) -> Pair[int]:
    return min(prices), max(prices)


def fetch_page(cursor: str | None) -> Paginated[str]:
    return ["A1042", "A1043"], None


price_range([1600, 900, 2450]), fetch_page(None)
```

## Typing decorators with ParamSpec

Here's the decorator from module 8, typed the obvious way:

```python norun
import functools
from collections.abc import Callable
from typing import Any


def logged(fn: Callable[..., Any]) -> Callable[..., Any]:
    @functools.wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        print(f"calling {fn.__name__}")
        return fn(*args, **kwargs)

    return wrapper


@logged
def charge(order_id: str, amount_cents: int) -> bool:
    return amount_cents > 0


reveal_type(charge)
charge("A1042", "12.50")
```

```text
billing.py:20: note: Revealed type is "def (*Any, **Any) -> Any"
Success: no issues found in 1 source file
```

`@logged` replaced `charge` with a function that takes anything and returns `Any`, so the bad call
passes. `functools.wraps` copies the name and docstring at runtime, but mypy only reads the hints.

The fix is a type parameter that stands for a whole parameter list. `**P` declares a **ParamSpec**,
and `R` is the return type. `Callable[P, R]` in and `Callable[P, R]` out says the wrapper has
exactly the same signature as the function it wraps:

```python
import functools
from collections.abc import Callable


def logged[**P, R](fn: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print(f"calling {fn.__name__}")
        return fn(*args, **kwargs)

    return wrapper


@logged
def charge(order_id: str, amount_cents: int) -> bool:
    return amount_cents > 0


charge("A1042", 1250)
```

Add back `reveal_type(charge)` and the bad call, and mypy sees the real signature:

```text
billing.py:19: note: Revealed type is "def (order_id: builtins.str, amount_cents: builtins.int) -> builtins.bool"
billing.py:20: error: Argument 2 to "charge" has incompatible type "str"; expected "int"  [arg-type]
```

`*args: P.args, **kwargs: P.kwargs` is the only way to use `P` inside the wrapper: it means "the
same arguments `fn` takes", which is also what lets you pass them straight on to `fn`. A decorator
with arguments, such as `@retry(3)`, puts the type parameters on the outer function and returns
`Callable[[Callable[P, R]], Callable[P, R]]`, the decorator it builds.

> [!TIP]
> A decorator that supplies an argument, such as a database connection, uses `Concatenate`:
> `fn: Callable[Concatenate[Connection, P], R]` returning `Callable[P, R]` removes the first
> parameter from the decorated function's signature.

## Where this leaves you

A type parameter, `def first[T](...)` or `class Page[T]`, lets one piece of code work for every type
while mypy tracks which type each call uses. `Callable[[A], B]` types functions passed as values,
a bound (`[E: Event]`) allows attributes while keeping the precise type, and `type Pair[T] = ...`
names a generic type. `[**P, R]` with `P.args` and `P.kwargs` types a decorator that keeps its
signature, which is exactly what the last two drills ask of you.
