---
slug: type-hints-and-mypy
title: Type hints and mypy
summary: Hints say what a function takes and returns. Python ignores them; mypy reads them and finds bugs before the code runs.
minutes: 40
exercises:
  - types-predict-hints-at-runtime
  - types-annotate-line-total
  - types-fix-mypy-report
  - types-refund-policy
---

A discount function has worked for months. Then a new checkout form starts sending the percentage
as the text `"10"` instead of the number `10`, and the first anyone hears of it is a crash report
from production:

```python raises
def apply_discount(total_cents, percent):
    return total_cents - total_cents * percent // 100


apply_discount(5000, "10")
```

Nothing in the function says what `percent` should be, so nothing could warn you. **Type hints**
say it, and a tool called **mypy** reads them and reports that call as a bug without running
anything. This lesson covers how to write hints, what Python does with them (almost nothing), and how
to read what mypy tells you.

## Annotating a function

A hint goes after a parameter's name, following a colon, and the return type goes after `->`:

```python
def line_total(quantity: int, unit_price_cents: int) -> int:
    return quantity * unit_price_cents


def print_receipt_line(name: str, cents: int) -> None:
    print(f"{name:<14}{cents / 100:>8.2f}")


vat_rate: float = 0.2
print_receipt_line("Coffee beans", line_total(2, 1250))
```

- Built-in classes are types: `int`, `float`, `str`, `bool`, and any class you write.
- A function that returns nothing is `-> None`. That's what it really returns.
- Containers say what they hold in square brackets: `list[str]`, `dict[str, int]`. Lesson 3 covers
  them properly.
- A variable can be annotated too (`vat_rate: float = 0.2`), but you rarely need to: the checker
  can see it's a float.

> [!JS]
> Coming from TypeScript: the positions are the same (`quantity: int`), but the return type uses
> `->` instead of `:`, and Python has separate `int` and `float` types where TypeScript has
> `number`.

## Python doesn't check them

Hints are for tools and for readers. Python itself stores them and moves on. Call `line_total` with
the wrong types and it runs whatever the body does with them:

```python
def line_total(quantity: int, unit_price_cents: int) -> int:
    return quantity * unit_price_cents


line_total("2", 3)
```

`"2" * 3` is string repetition, so you get `"222"` and no error at all. The hints are still there,
attached to the function, which is how tools such as Pydantic (lesson 6) can read them:

```python
from typing import get_type_hints


def line_total(quantity: int, unit_price_cents: int) -> int:
    return quantity * unit_price_cents


get_type_hints(line_total)
```

Since Python 3.14, annotations aren't even evaluated when the function is defined; they're computed
the first time something asks for them (PEP 649). That's why a hint can name a class defined further
down the file. Either way, the runtime cost of a hint is close to nothing, and so is its runtime
effect.

> [!JS]
> Coming from TypeScript: the same deal. `tsc` checks your types and then erases them, so nothing
> checks at runtime. Python keeps the hints around as data, but it doesn't check them either.

## Running mypy

mypy reads your code without running it and checks every call and return against the hints. In a
project you install it as a development tool and point it at your files (module 10 sets this up
properly):

```bash
uv add --dev mypy
uv run mypy billing.py
```

Here's what it says about the typed version of the discount function:

```python raises
def apply_discount(total_cents: int, percent: int) -> int:
    return total_cents - total_cents * percent // 100


apply_discount(5000, "10")
```

```text
billing.py:5: error: Argument 2 to "apply_discount" has incompatible type "str"; expected "int"  [arg-type]
Found 1 error in 1 file (checked 1 source file)
```

Each line reads `file:line: error: message [code]`. The message says what's wrong and what was
expected. The code in brackets names the kind of error, which is what you search for in mypy's
documentation. In this course you don't install anything: the drills run real mypy in your browser
when you press **Run tests**. It takes a few seconds.

```quiz
question: "With `percent: int`, what does mypy say about `apply_discount(5000, 10.5)`?"
options:
  - Nothing, because 10.5 is a number
  - "An error: a float isn't an int"
  - It can't tell without running the code
answer: 1
explain: "An int is accepted where a float is expected, but not the other way round: 10.5 would lose its fraction. mypy reports it as an arg-type error without running anything."
```

## What mypy works out for itself

You don't annotate every variable. mypy **infers** types from what you assign, and from the return
types of the functions you call. To see what it thinks, write `reveal_type(expression)`, which mypy
understands without an import:

```python norun
def average(prices: list[float]) -> float:
    return sum(prices) / len(prices)


totals = [19.99, 5.0]
reveal_type(totals)
reveal_type(average(totals))
reveal_type({"MUG-01": 3})
```

```text
billing.py:6: note: Revealed type is "builtins.list[builtins.float]"
billing.py:7: note: Revealed type is "builtins.float"
billing.py:8: note: Revealed type is "builtins.dict[builtins.str, builtins.int]"
```

`builtins.` is just where those classes live. `reveal_type` is a question for the checker, so delete
it once you have your answer. (Python 3.11+ also has `typing.reveal_type`, which prints the runtime
type when the code runs.)

The hints you do need are on function signatures: parameters and return types. Those are the
boundaries mypy can't see across, and they're the part a reader wants to know.

## Unannotated code isn't checked

Here's the trap. By default, mypy **skips the body of any function without hints**, on the theory
that you haven't opted it in yet. This file has the same bug in two functions:

```python norun
def shipping_label(order):
    return order["id"] + 1042


def invoice_number(order_id: str) -> str:
    return order_id + 1042
```

```text
billing.py:6: error: Unsupported operand types for + ("str" and "int")  [operator]
Found 1 error in 1 file (checked 1 source file)
```

Only the annotated function is reported. The other one is silently treated as "anything goes".
`--strict` switches on a set of stricter checks; among them, every function must be annotated, and
typed code may not call untyped code:

```bash
uv run mypy --strict billing.py
```

```text
billing.py:1: error: Function is missing a type annotation  [no-untyped-def]
billing.py:9: error: Call to untyped function "shipping_label" in typed context  [no-untyped-call]
```

Every mypy drill in this module checks your code with `--strict`, which is also the right setting
for new projects. Under `--strict`, even a function that returns nothing needs `-> None`.

```quiz
question: Without --strict, what does mypy report for a function that has no hints at all?
options:
  - Every type error inside it
  - Nothing inside it
  - A warning that it has no hints
answer: 1
explain: mypy doesn't check the body of an unannotated function by default. That's why a file can pass mypy and still be full of type errors. --strict turns this into an error.
```

## Any and object

Sometimes you really can't say what a value is. There are two ways to spell "anything", and they
mean opposite things:

- `Any` switches checking off. Every operation on it is allowed, and it spreads: whatever you get
  back from an `Any` is `Any` too.
- `object` is the type every value has. mypy accepts any value for it, but then lets you do only
  what every object can do, until you check what it really is.

```python norun
from typing import Any


def log_payload(payload: Any) -> None:
    print(payload.upper())


def log_event(event: object) -> None:
    print(event.upper())
```

```text
billing.py:9: error: "object" has no attribute "upper"  [attr-defined]
```

Reach for `object` when you mean "any value, and I'll check it", and treat `Any` as an escape hatch
with a comment explaining why.

> [!JS]
> Coming from TypeScript: `Any` is `any` and `object` is `unknown`. The advice is the same in both
> languages: prefer the one that makes you check.

```quiz
question: A function takes a JSON value it will inspect with isinstance before using. Which hint fits?
options:
  - Any
  - object
answer: 1
explain: With object, mypy makes you narrow the value (lesson 2) before you use it, which is exactly the checking you intend to do. With Any, a forgotten check goes unnoticed.
```

## Constants with Final

Python has no constants: `MAX_RETRIES = 3` is a variable that people agree not to change. `Final`
makes that agreement something mypy enforces:

```python
from typing import Final

MAX_RETRIES: Final = 3
VAT_RATE: Final = 0.2

MAX_RETRIES = 5
MAX_RETRIES
```

It runs, because `Final` is a hint and Python ignores hints. mypy doesn't:

```text
billing.py:6: error: Cannot assign to final name "MAX_RETRIES"  [misc]
```

`Final` on its own lets mypy infer the type (`int` here). You can also write `Final[int]`.

> [!TIP]
> `Final` suits configuration that must never change while the program runs: limits, rates and
> fixed URLs. Keep the capitals too, so readers see it's a constant without looking at the hint.

## Where this leaves you

Hints go on parameters and return types, and Python stores them without checking. mypy reads them,
infers the rest, and reports mismatches as `file:line: error: message [code]`. `--strict` makes sure
no function escapes checking. `object` is the safe "anything", `Any` switches checking off, and
`Final` stops a constant being reassigned. The drills start with what Python does with hints at
runtime and end with a fully typed refund policy.
