---
slug: collections-and-typeddict
title: Collections and TypedDict
summary: Say what a list or dict holds, accept the widest type a function can use, and describe JSON-shaped dicts key by key.
minutes: 40
exercises:
  - types-annotate-empty-containers
  - types-predict-typeddict-runtime
  - types-refactor-sequence-params
  - types-typeddict-order-payload
  - types-summarise-customers
---

Most data in a real program lives in containers: a list of order lines, a dict of stock levels, and
above all the dicts that `json.loads` gives you for every API payload. `list` alone tells mypy
nothing about what's inside, and `dict[str, Any]` switches checking off for the most error-prone data
you handle. This lesson covers typing containers precisely, choosing parameter types that don't
reject perfectly good arguments, and `TypedDict` for JSON objects.

## What's inside the container

Square brackets say what a container holds. The item types can nest as deeply as the data does:

```python
skus: list[str] = ["MUG-01", "BEANS-1KG"]
stock: dict[str, int] = {"MUG-01": 7, "BEANS-1KG": 40}
tags: set[str] = {"gift", "fragile"}
by_supplier: dict[str, list[str]] = {"Stoneware Co": ["MUG-01", "MUG-02"]}

line: tuple[str, int] = ("MUG-01", 2)          # exactly two items: a str, then an int
sizes_g: tuple[int, ...] = (250, 500, 1000)   # any number of ints

sku, quantity = line
quantity * 2
```

Tuples are the odd one out. `tuple[str, int]` is a fixed shape, like a record: mypy knows the first
item is a `str` and the second an `int`, and rejects a third. `tuple[int, ...]` (with a literal
`...`) is a sequence of any length, like an immutable list.

```python norun
line: tuple[str, int] = ("MUG-01", 2)
sizes_g: tuple[int, ...] = (250, 500, 1000)
bad: tuple[str, int] = ("MUG-01", 2, "extra")
```

```text
billing.py:3: error: Incompatible types in assignment (expression has type "tuple[str, int, str]", variable has type "tuple[str, int]")  [assignment]
```

## Empty containers need a hint

From `stock = {"MUG-01": 7}` mypy infers `dict[str, int]`. From `stock = {}` it can infer nothing,
unless the very next thing you do fills it in a way it recognises, such as `append` or `add`. When it
can't tell, it asks:

```python norun
def stock_by_sku(movements: list[tuple[str, int]]) -> dict[str, int]:
    stock = {}
    for sku, change in movements:
        stock[sku] = stock.get(sku, 0) + change
    return stock
```

```text
billing.py:2: error: Need type annotation for "stock" (hint: "stock: dict[<type>, <type>] = ...")  [var-annotated]
```

The fix is the hint it suggests. It's one of the few places a variable annotation earns its keep:

```python
def stock_by_sku(movements: list[tuple[str, int]]) -> dict[str, int]:
    stock: dict[str, int] = {}
    for sku, change in movements:
        stock[sku] = stock.get(sku, 0) + change
    return stock


stock_by_sku([("MUG-01", 10), ("MUG-01", -3), ("BEANS-1KG", 40)])
```

## Ask for the least you need

This looks right, and mypy rejects the call:

```python norun
def average(prices: list[float]) -> float:
    return sum(prices) / len(prices)


whole_prices: list[int] = [10, 20]
average(whole_prices)
average((19.99, 5.0))
```

```text
billing.py:6: error: Argument 1 to "average" has incompatible type "list[int]"; expected "list[float]"  [arg-type]
billing.py:6: note: "list" is invariant -- see https://mypy.readthedocs.io/en/stable/common_issues.html#variance
billing.py:6: note: Consider using "Sequence" instead, which is covariant
billing.py:7: error: Argument 1 to "average" has incompatible type "tuple[float, float]"; expected "list[float]"  [arg-type]
```

An int is fine where a float is expected, so why isn't a list of ints fine where a list of floats is
expected? Because a function that takes `list[float]` is allowed to do `prices.append(0.5)`. If you
passed it your `list[int]`, your list of ints would now hold a float. mypy can't know the function
won't do that, so it refuses. This is what **invariant** means: `list[int]` and `list[float]` are
unrelated types, even though `int` and `float` are related.

The cure is to ask for what the function actually does with its argument. The abstract types in
`collections.abc` describe exactly that:

| The function… | Ask for | Accepts |
|---------------|---------|---------|
| loops over it once | `Iterable[float]` | lists, tuples, sets, generators, dict keys… |
| also needs `len()` or indexing | `Sequence[float]` | lists, tuples, strings, ranges |
| reads a dict without changing it | `Mapping[str, int]` | dicts and other mappings |

`Sequence` and `Mapping` are read-only, so they can safely be **covariant**: a `Sequence[int]` is
accepted as a `Sequence[float]`. Return types go the other way: return the concrete `list` or
`dict`, so callers get every method.

```python
from collections.abc import Iterable, Sequence


def average(prices: Sequence[float]) -> float:
    return sum(prices) / len(prices)


def total(prices: Iterable[float]) -> float:
    return sum(prices)


average([10, 20]), average((19.99, 5.0)), total(p * 1.2 for p in [10.0, 20.0])
```

```quiz
question: A function counts how many order totals are over 100 by looping over them once. Which parameter type accepts the most callers?
options:
  - "list[float]"
  - "Sequence[float]"
  - "Iterable[float]"
answer: 2
explain: "One pass is all it needs, and Iterable is the smallest promise that allows a for loop, so generators and sets are accepted too. Sequence would reject a generator for no reason."
```

## TypedDict: the shape of a JSON object

`json.loads` gives you a `dict`, and a payload's keys each have their own type: `order_id` is a
string, `lines` is a list. `dict[str, int]` can't say that. A `TypedDict` lists the keys and the type
of each one:

```python norun
from typing import NotRequired, TypedDict


class LineItem(TypedDict):
    sku: str
    quantity: int


class OrderPayload(TypedDict):
    order_id: str
    lines: list[LineItem]
    coupon: NotRequired[str]


def order_quantity(order: OrderPayload) -> int:
    return sum(line["quantity"] for line in order["lines"])


order_quantity({"order_id": "A1042", "lines": [{"sku": "MUG-01", "quantity": "2"}]})
order_quantity({"order_id": "A1042"})
order_quantity({"order_id": "A1042", "lines": [], "cupon": "VIP25"})
```

```text
billing.py:19: error: Incompatible types (expression has type "str", TypedDict item "quantity" has type "int")  [typeddict-item]
billing.py:20: error: Missing key "lines" for TypedDict "OrderPayload"  [typeddict-item]
billing.py:21: error: Extra key "cupon" for TypedDict "OrderPayload"  [typeddict-unknown-key]
```

A misspelled key on read is caught too: `order["line"]` gets `TypedDict "OrderPayload" has no key
"line"`, with a `Did you mean "lines"?` note. At runtime, none of this exists. A `TypedDict` builds
and describes ordinary dicts, so it costs nothing and works with `json.loads` output directly:

```python
import json
from typing import TypedDict


class LineItem(TypedDict):
    sku: str
    quantity: int


line: LineItem = json.loads('{"sku": "MUG-01", "quantity": 2}')
also = LineItem(sku="MUG-01", quantity=2)
type(line), line == also
```

The flip side: nothing checks the JSON really has that shape. The hint on `line` is a promise you
make to mypy about data from outside. Pydantic (lesson 6) is how you check the promise.

> [!JS]
> Coming from TypeScript: a `TypedDict` is an object type, `{ order_id: string; lines: LineItem[] }`,
> and it's structural in the same way. Any dict with the right keys fits; nothing has to be declared
> as an `OrderPayload`.

## Keys that may be missing

`NotRequired[str]` marks a key that may be absent. Reading it with `.get()` gives `str | None`, which
mypy then makes you narrow like any other optional value:

```python norun
def coupon_code(order: OrderPayload) -> str:
    reveal_type(order.get("coupon"))
    return order["coupon"].upper()
```

```text
billing.py:25: note: Revealed type is "builtins.str | None"
```

mypy accepts `order["coupon"]` even though the key may be missing, and at runtime that raises
`KeyError`. For a `NotRequired` key, use `.get()` and handle `None`. When most keys are optional,
write `class Filters(TypedDict, total=False):` to make every key optional, and mark the exceptions
`Required[...]`.

```quiz
question: "An `OrderPayload` has `coupon: NotRequired[str]`. What is `{\"order_id\": \"A1\", \"lines\": [], \"coupon\": None}` to mypy?"
options:
  - A valid OrderPayload
  - "An error: coupon must be a str when it's there"
answer: 1
explain: "NotRequired means the key may be left out, not that it may be None. For a key that's present but null, the hint is coupon: NotRequired[str | None]."
```

## Naming types with type

A long type written out in five signatures is hard to read and easy to get subtly different. The
`type` statement (Python 3.12+) gives it a name:

```python
type Cents = int
type LineItems = list[tuple[str, int, Cents]]   # sku, quantity, unit price


def subtotal(lines: LineItems) -> Cents:
    return sum(quantity * price for _sku, quantity, price in lines)


subtotal([("MUG-01", 2, 800), ("BEANS-1KG", 1, 2450)]), LineItems.__value__
```

The right-hand side is evaluated lazily, only when something asks for it through `.__value__`, so an
alias can refer to a class defined later in the file. An alias is just a name: `Cents` and `int` are
interchangeable, and mypy won't stop you passing a count of items as a `Cents`. When you need mypy to
keep two kinds of int apart, `typing.NewType` makes a genuinely distinct type.

## Where this leaves you

Containers say what they hold: `list[str]`, `dict[str, int]`, `tuple[str, int]` for a fixed shape,
and a hint on any empty container mypy can't work out. Parameters ask for the least they need
(`Iterable`, `Sequence`, `Mapping`) because `list` is invariant, and return types stay concrete.
`TypedDict` gives each key of a JSON-shaped dict its own type, with `NotRequired` for keys that may
be missing, and `type` names a type you use often. The drills finish with a per-customer summary
built from typed rows.
