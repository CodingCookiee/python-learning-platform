---
slug: lazy-pipelines
title: Generator expressions and lazy pipelines
summary: Chain generators and itertools into pipelines that stream one record at a time, so a log of any size runs in the same small amount of memory.
minutes: 45
exercises:
  - gen-refactor-total-bytes
  - gen-predict-pipeline-order
  - gen-first-errors
  - gen-fix-eager-pipeline
  - gen-hourly-error-rates
---

A web server writes a few gigabytes of access log a day. Code that starts with
`lines = open(path).readlines()` needs all of it in memory at once before it can count a single
error, and falls over when the log outgrows the machine. Generators fix this without any clever
tricks: each stage of the job takes an iterator and yields an iterator, and records flow through
the whole chain one at a time. This lesson builds such a pipeline and shows exactly how the
records move through it.

## Generator expressions

A list comprehension builds a list. Swap its square brackets for round ones and you get a
**generator expression**: the same syntax, but it builds a generator that produces the values
lazily.

```python
sizes = ["512", "2048", "-", "128"]

as_list = [int(size) for size in sizes if size != "-"]
as_generator = (int(size) for size in sizes if size != "-")
as_list, as_generator, list(as_generator)
```

When a generator expression is the only argument to a function, the extra brackets can go. This is
the idiomatic way to total, count or check a stream:

```python
sizes = ["512", "2048", "-", "128"]
total = sum(int(size) for size in sizes if size != "-")
any_large = any(int(size) > 1000 for size in sizes if size != "-")
total, any_large
```

A generator expression is a generator like any other: single-pass, and nothing is computed until
something asks for it. `any()` also stops at the first `True`, so the sizes after `"2048"` were
never even converted.

## What laziness saves

`sys.getsizeof` reports how many bytes an object itself takes up. Compare a list of a million
numbers with a generator that can produce the same million:

```python
import sys

squares_list = [n * n for n in range(1_000_000)]
squares_gen = (n * n for n in range(1_000_000))
sys.getsizeof(squares_list), sys.getsizeof(squares_gen)
```

The list is about 8 MB, and that's only its array of pointers: `getsizeof` is shallow, so the
million int objects it points to are extra. The generator is a couple of hundred bytes whatever the
range, because all it holds is a paused frame: the current position in `range` and nothing else.
Summing both gives the same answer; only one of them needs the memory.

> [!NOTE]
> Laziness isn't free speed. Producing values one at a time has a small overhead per value, so a
> generator is rarely faster than a list for data that fits in memory comfortably. Its win is
> memory, and the ability to start producing results before the input ends.

## A pipeline of stages

Here is a log job as three small generator functions, each taking an iterable and yielding
results. None of them knows where its input comes from or who reads its output:

```python
def parse(lines):
    for line in lines:
        parts = line.split()
        if len(parts) == 3:
            path, status, ms = parts
            yield path, int(status), int(ms)

def server_errors(requests):
    for path, status, ms in requests:
        if status >= 500:
            yield path, ms

log = [
    "/home 200 12",
    "/pay 502 3004",
    "corrupted line",
    "/cart 404 8",
    "/pay 503 2950",
]
errors = server_errors(parse(log))
errors, list(errors)
```

The `log` list stands in for a file. Open a real file and pass the file object instead, and the
same code processes a 5 GB log in the memory of one line, because a file object is itself a lazy
iterator over lines.

Each stage can be tested on a three-line list, and new stages slot in anywhere. The last step is
whatever consumes the stream: a `for` loop, `sum()`, `Counter()`, or writing to another file.

```python
from collections import Counter

def parse(lines):
    for line in lines:
        parts = line.split()
        if len(parts) == 3:
            path, status, ms = parts
            yield path, int(status), int(ms)

log = ["/home 200 12", "/pay 502 3004", "/cart 404 8", "/pay 503 2950"]
Counter(path for path, status, _ in parse(log) if status >= 500)
```

## One record at a time through every stage

A pipeline is **pull-based**. Building it runs nothing. When the consumer asks the last stage for a
value, that stage asks the one before it, and so on back to the source. A single record travels the
whole way before the next one is read:

```python
def read(lines):
    for line in lines:
        print(f"  read {line!r}")
        yield line

def parse(lines):
    for line in lines:
        status = int(line.split()[1])
        print(f"  parsed {status}")
        yield status

statuses = (status for status in parse(read(["/home 200", "/pay 502", "/cart 404"])) if status >= 500)
print("pipeline built, nothing read yet")
print("first error:", next(statuses))
```

Only two lines were read: the consumer asked for one error, and the second line was it. That is
the property that makes a pipeline work on an endless input, like a log that's still being
written: each result appears as soon as the records that produce it have arrived.

```quiz
question: "A pipeline is built as `errors = server_errors(parse(read(log_file)))`, and nothing else runs. How many lines have been read from the file?"
options:
  - "All of them"
  - "One"
  - "None"
answer: 2
explain: Calling a generator function runs none of its body, so all three calls just build generators. The first line is read when something calls next() on errors.
```

## itertools as lazy building blocks

Module 4 used `itertools` on lists. Every one of those functions takes any iterable and returns a
lazy iterator, so they're pipeline stages that come ready-made:

| Stage | Does |
|-------|------|
| `islice(it, n)` | The first `n` items, then stops pulling (a `head` for streams) |
| `takewhile(pred, it)` / `dropwhile(pred, it)` | Items while a condition holds / after it stops holding |
| `chain.from_iterable(its)` | Several streams, such as one per log file, as one |
| `batched(it, n)` | Tuples of `n`, for bulk inserts and API calls that take a list |
| `groupby(it, key)` | Runs of consecutive items with the same key, one group at a time |
| `count()` / `repeat()` / `cycle()` | Endless sources, made safe by `islice` or `zip` |

Here they are together: the first two batches of errors, from two log files, numbered as they go:

```python
from itertools import batched, chain, count, islice

monday = ["/pay 502", "/home 200", "/pay 503"]
tuesday = ["/cart 500", "/api 504", "/home 200", "/pay 502"]

lines = chain.from_iterable([monday, tuesday])
errors = (line.split()[0] for line in lines if int(line.split()[1]) >= 500)
numbered = zip(count(1), errors)
list(islice(batched(numbered, 2), 2))
```

`count(1)` is infinite, and `zip` stops when the shorter side runs out, so it only ever counts as
far as there are errors. `groupby` is especially useful in a stream, because a log is already in
time order: it hands out one group at a time, so you can total each hour as it finishes without
holding the day.

> [!JS]
> Coming from JavaScript: arrays' `map` and `filter` are eager and build a new array at every step.
> The newer iterator helpers (`iterator.map(...)`, `.filter()`, `.take()`) are the lazy version of
> a Python pipeline.

## Where laziness stops

Some operations can't produce anything until they've seen everything. `sorted()`, `max()` over a
whole stream, `len(list(...))` and `reversed()` all consume the input in full, and `sorted` holds
all of it. A pipeline is lazy only up to its first such step, so put them last, on the smallest data
you can: count errors per path lazily with a `Counter`, then sort the few hundred paths.

Two traps are easy to fall into:

- A pipeline is made of iterators, so it's single-pass. Store it in a variable, use it for one
  report, and a second report on the same variable sees nothing.
- A generator expression evaluates its **first** `for` clause immediately, but everything else
  lazily. That's why a mistake in the source shows up at once, while a mistake in the condition
  waits until the first value is pulled:

```python raises
orders = ["A1", "A2"]
checked = (order for order in orders if order.startswith(PREFIX))   # PREFIX isn't defined
print("built fine")
next(checked)
```

## Where this leaves you

Generator expressions are comprehensions that produce values lazily. A pipeline of generator stages
and `itertools` functions pulls one record at a time from the source through every stage, so its
memory stays flat whatever the input size, and results appear before the input ends. Anything that
needs all the data, such as sorting, belongs at the end. The drills build a pipeline, predict the
order records move through one, and fix one that quietly read everything.
