---
slug: generators-and-yield
title: Generators and yield
summary: A function with yield in it returns a generator, an iterator whose frame pauses at each yield and resumes on the next next() call.
minutes: 40
exercises:
  - gen-backoff-delays
  - gen-predict-step-order
  - gen-refactor-config-lines
  - gen-paginate
  - gen-log-sessions
---

The iterator classes in the last lesson all did the same bookkeeping: store the position on `self`,
check for the end in `__next__`, move forward, return a value. A **generator** lets Python do that
bookkeeping for you. You write an ordinary-looking loop, put `yield` where the values come out, and
Python turns the function into an iterator whose position is simply "where the code is up to".

## A function that pauses

Here is `AttemptsLeft` from the last lesson, as a generator function:

```python
def attempts_left(attempts):
    while attempts > 0:
        yield attempts
        attempts -= 1

list(attempts_left(3))
```

Four lines instead of twelve, and no `StopIteration` in sight. The presence of `yield` anywhere in a
function body changes what calling it means. The body does **not** run. Instead you get a
**generator object**, and the body runs a step at a time as you ask for values:

```python
def read_orders():
    print("connecting to the order feed")
    yield "A1"
    print("fetching the next order")
    yield "A2"
    print("feed finished")

feed = read_orders()     # prints nothing
feed
```

Each `next()` runs the body from where it last stopped up to the next `yield`, and hands over the
yielded value:

```python
def read_orders():
    print("connecting to the order feed")
    yield "A1"
    print("fetching the next order")
    yield "A2"
    print("feed finished")

feed = read_orders()
print("got", next(feed))
print("got", next(feed))
```

When the body runs off the end, the generator raises `StopIteration`, exactly as the protocol
requires. A `for` loop, `list()` or `sum()` catches it for you.

```python raises
def read_orders():
    yield "A1"
    print("feed finished")

feed = read_orders()
next(feed)
next(feed)
```

> [!JS]
> Coming from JavaScript: this is `function*`, and calling it returns a generator object in both
> languages. Python needs no star: one `yield` anywhere in the body makes the whole function a
> generator function.

## The frame is suspended, not finished

An ordinary call creates a **frame**, the object that holds the function's local variables and
where it's up to, and throws it away on `return`. A generator keeps its frame alive between
calls. `yield` saves the current instruction and hands a value out; `next()` resumes the same frame
at the instruction after the `yield`, with every local variable exactly as it was left.

You can look at the paused frame. `gi_frame` is the generator's frame, and
`inspect.getgeneratorstate` says what it's doing:

```python
from inspect import getgeneratorstate

def invoice_numbers(prefix, start):
    number = start
    while True:
        yield f"{prefix}-{number:05d}"
        number += 1

numbers = invoice_numbers("INV", 41)
state_before = getgeneratorstate(numbers)
first, second = next(numbers), next(numbers)
state_before, first, second, numbers.gi_frame.f_locals, getgeneratorstate(numbers)
```

`GEN_CREATED` means the body hasn't started. After two `next()` calls it's `GEN_SUSPENDED`, paused
at the `yield` with `number` still 42 in its frame. That paused frame is the whole trick: the
position a class iterator stored on `self` is here stored as "the next line to run", plus the
locals.

This generator never ends, and that's fine: it's lazy, so it only does work when asked. Take as
many as you need with `islice`:

```python
from itertools import islice

def invoice_numbers(prefix, start):
    number = start
    while True:
        yield f"{prefix}-{number:05d}"
        number += 1

list(islice(invoice_numbers("INV", 41), 3))
```

```quiz
question: "`def ping(): print('sent'); yield 1`. What does the line `result = ping()` print?"
options:
  - "sent"
  - "Nothing"
  - "1"
answer: 1
explain: "Calling a generator function only creates the generator object. The body, including the print, runs when something calls next() on it."
```

## The mistake: side effects that never happen

Because calling a generator function runs nothing, a stray `yield` can silently disable a function.
Someone added a `yield` so that callers could see which customers were emailed, and the emails
stopped:

```python
sent = []

def send_reminders(customers):
    for customer in customers:
        sent.append(f"reminder to {customer}")   # stands in for sending an email
        yield customer

send_reminders(["ada@example.com", "grace@example.com"])
sent
```

Nothing was sent, and nothing raised. The call built a generator and threw it away. Either consume
it (`for customer in send_reminders(...)`), or keep actions and generators separate: a generator
should produce values, and whoever consumes them should decide what to do.

## Generators are iterators

A generator object implements the protocol from the last lesson: `__next__` runs to the next
`yield`, and `__iter__` returns the generator itself. So it has an iterator's limits too. It's
single-pass, and a second loop finds it empty:

```python
def statuses():
    yield 200
    yield 503

codes = statuses()
iter(codes) is codes, list(codes), list(codes)
```

`inspect` can tell a generator function from the generator it returns, which is handy in tests:

```python
import inspect

def statuses():
    yield 200

inspect.isgeneratorfunction(statuses), inspect.isgenerator(statuses()), inspect.isgenerator(statuses)
```

The single pass is also why a generator makes a perfect `__iter__`. Every loop calls `__iter__`,
every call creates a fresh generator, so the container loops as often as you like:

```python
class OrderBatch:
    def __init__(self, orders):
        self._orders = list(orders)

    def __iter__(self):
        for order in self._orders:
            yield order

batch = OrderBatch(["A1", "A2"])
list(batch), list(batch), type(iter(batch)).__name__
```

## return ends a generator

`return` inside a generator stops it. A bare `return` is the usual way out early:

```python
def until_blank(lines):
    for line in lines:
        if not line.strip():
            return            # a blank line ends the headers
        yield line

request = ["Host: shop.example", "Accept: */*", "", "<html>...</html>"]
list(until_blank(request))
```

`return value` is allowed too. The value doesn't come out of the loop; it's attached to the
`StopIteration` exception as `.value`. Loops ignore it, but lesson 4 shows how `yield from` collects
it:

```python
def parse_rows(rows):
    skipped = 0
    for row in rows:
        if "," not in row:
            skipped += 1
            continue
        yield row.split(",")
    return skipped

rows = parse_rows(["A1,12.50", "garbage", "A2,8.00"])
next(rows), next(rows)
try:
    next(rows)
except StopIteration as stop:
    skipped = stop.value
skipped
```

> [!WARNING]
> Never `raise StopIteration` inside a generator to end it. Since Python 3.7 that's turned into a
> `RuntimeError`, because a `StopIteration` leaking out of some inner `next()` call used to end
> generators silently. Use `return`.

## Where this leaves you

A generator function returns a generator object without running anything. Each `next()` resumes
its suspended frame, runs to the next `yield`, and pauses again; running off the end or `return`
raises `StopIteration`. Generators are iterators, so they're single-pass and lazy, which lets them
be infinite. The drills have you predict the order generator steps run in and replace class
iterators with a few lines of `yield`.
