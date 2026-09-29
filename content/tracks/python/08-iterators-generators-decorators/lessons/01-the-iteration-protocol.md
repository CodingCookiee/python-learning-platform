---
slug: the-iteration-protocol
title: The iteration protocol
summary: Every for loop calls iter() once and next() until StopIteration, and that two-method protocol explains why some objects loop forever and others only once.
minutes: 35
exercises:
  - iter-csv-header
  - iter-predict-exhausted
  - iter-date-range
  - iter-fix-reusable-batch
  - iter-round-robin
---

You can loop over a list, a string, a dict, a file, a `range`, a `zip` and a `map`. Some of them you
can loop over as often as you like; others give you everything once and then nothing, without any
error. Both behaviours come from one small protocol, two methods long. Once you can see it, you
can write your own objects that work in a `for` loop, and you'll never be surprised by an empty
second pass again.

## What a for loop really does

A `for` loop doesn't know anything about lists. It asks the object for an **iterator** with
`iter()`, then calls `next()` on that iterator until it raises `StopIteration`. You can do the same
steps by hand:

```python
statuses = [200, 404, 500]
it = iter(statuses)       # step 1: get an iterator
next(it), next(it), next(it)
```

A fourth `next()` has nothing left to give, so it raises `StopIteration`. That exception is not an
error; it's the signal that means "finished":

```python raises
statuses = [200, 404, 500]
it = iter(statuses)
next(it), next(it), next(it)
next(it)
```

So this loop:

```python norun
for status in statuses:
    print(status)
```

runs as if you'd written:

```python
statuses = [200, 404, 500]

it = iter(statuses)
while True:
    try:
        status = next(it)
    except StopIteration:
        break
    print(status)
```

CPython does exactly this in C: the `GET_ITER` bytecode calls `iter()` once, and `FOR_ITER` calls
`next()` each time round, jumping out of the loop when the iterator is exhausted. Everything that
consumes values one at a time, `list()`, `sum()`, `sorted()`, `in`, unpacking, `zip()`, works the
same way.

> [!TIP]
> `next(it, default)` returns `default` instead of raising when the iterator is empty.
> `next(iter(rows), None)` is the idiomatic "first item, or `None` if there isn't one".

## Iterables and iterators are different things

Two words, two jobs:

- An **iterable** is anything you can pass to `iter()`: it has an `__iter__` method that returns an
  iterator. Lists, strings, dicts, sets, files and ranges are iterables.
- An **iterator** is the object that does the walking. It has `__next__`, which returns the next
  value or raises `StopIteration`, and `__iter__`, which returns **itself**.

A list is an iterable but not an iterator: it holds data, and each `iter()` call gives you a fresh
iterator that starts from the beginning. The iterator only holds a position.

```python
orders = ["A1", "A2", "A3"]
first = iter(orders)
second = iter(orders)
next(first), next(first), next(second)
```

Two independent iterators, each with its own position. That's why you can nest two loops over the
same list. An iterator, on the other hand, returns itself from `iter()`, so there is only ever one
position:

```python
orders = ["A1", "A2", "A3"]
it = iter(orders)
iter(it) is it, iter(orders) is iter(orders)
```

> [!JS]
> Coming from JavaScript: `__iter__` is `[Symbol.iterator]()`, and `__next__` is `next()`. Instead
> of returning `{value, done: true}`, a Python iterator raises `StopIteration` when it's done.

## Why an iterator is empty after one pass

Because an iterator is its own iterator, a second loop over it picks up where the first one
stopped, which after a full pass is the end. Nothing raises; the second loop just doesn't run:

```python
response_times = map(int, ["120", "95", "310"])   # map returns an iterator
total = sum(response_times)
slowest = max(response_times, default=None)
total, slowest
```

`sum()` used every value, so `max()` got an empty iterator. This is a real bug in real reports, and
it's silent. `map`, `filter`, `zip`, `enumerate`, `reversed`, files, and every `itertools` function
return iterators. When you need the values twice, keep a list:

```python
response_times = list(map(int, ["120", "95", "310"]))
sum(response_times), max(response_times)
```

Partial consumption bites too. `in` stops at the first match, and leaves the iterator just after it:

```python
log_ids = iter(["L1", "L2", "L3", "L4"])
"L2" in log_ids, list(log_ids)
```

```quiz
question: "`pairs = zip(['mon', 'tue'], [3, 5])`, then `dict(pairs)`, then `list(pairs)`. What does `list(pairs)` return?"
options:
  - "[('mon', 3), ('tue', 5)]"
  - "[]"
  - "It raises StopIteration"
answer: 1
explain: zip returns an iterator. dict() consumed both pairs, so list() finds it exhausted and returns an empty list. StopIteration is caught by list() itself; it never reaches you.
```

## Writing an iterator class

To make your own iterator, give a class the two methods. Here is a countdown of retry attempts,
as a job scheduler might use it:

```python
class AttemptsLeft:
    def __init__(self, attempts):
        self.remaining = attempts

    def __iter__(self):
        return self                  # an iterator is its own iterator

    def __next__(self):
        if self.remaining == 0:
            raise StopIteration
        self.remaining -= 1
        return self.remaining + 1

attempts = AttemptsLeft(3)
[f"attempt, {n} left" for n in attempts], list(attempts)
```

The state (`remaining`) lives on the object, and `__next__` moves it forward one step per call.
Once it raises `StopIteration` it should keep raising it on every later call: that is part of the
protocol, and code that consumes iterators relies on it.

> [!WARNING]
> Forget `__iter__` and your object works with `next()` but not with `for`, which calls `iter()`
> first and gets `TypeError: 'AttemptsLeft' object is not iterable`.

## Making a reusable iterable

`AttemptsLeft` is single-pass, like every iterator. For a container you want to loop over many
times, such as a batch of orders, `__iter__` should return a **new** iterator each time. The
simplest way is to hand out an iterator over data you already hold:

```python
class OrderBatch:
    def __init__(self, orders):
        self._orders = list(orders)

    def __iter__(self):
        return iter(self._orders)    # a fresh iterator for every loop

batch = OrderBatch(["A1", "A2"])
[(a, b) for a in batch for b in batch]
```

Nested loops work because each one gets its own iterator. A class like this has no `__next__` at
all: it's an iterable, not an iterator. The next lesson shows the even shorter way to write
`__iter__`, with a generator.

## Iterating without a class

Two built-in shortcuts cover a lot of cases where you'd otherwise write a class:

- An object with `__getitem__` that accepts 0, 1, 2… and raises `IndexError` at the end is also
  iterable. That old protocol is why some classes loop without defining `__iter__`.
- `iter(callable, sentinel)` calls a function repeatedly until it returns the sentinel. It's made for
  reading until a marker:

```python
incoming = ["GET /", "GET /cart", "", "GET /never-read"]
read_line = iter(incoming).__next__   # a function that returns the next line

list(iter(read_line, ""))             # call it until it returns ""
```

## Where this leaves you

`for` calls `iter()` once and `next()` until `StopIteration`. Iterables hand out iterators; iterators
hold a position and return themselves from `iter()`, which is why they're used up after one pass.
The drills have you read a header off a stream, predict exhausted iterators, and write both kinds of
class yourself.
