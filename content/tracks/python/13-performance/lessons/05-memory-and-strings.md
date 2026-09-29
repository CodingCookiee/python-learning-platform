---
slug: memory-and-strings
title: Memory, generators and building strings
summary: Measure memory with sys.getsizeof and tracemalloc, keep it flat with generators, and build big strings in linear time with join.
minutes: 40
exercises:
  - perf-predict-getsizeof
  - perf-peak-memory
  - perf-stream-daily-totals
  - perf-invoice-join
  - perf-largest-orders
---

Time isn't the only thing code runs out of. A script that loads a day's orders into a list of dicts
works fine on a laptop and is killed on a small server once the file hits a few million lines. A
report built by gluing strings together gets slower with every line it adds. This lesson measures
memory, keeps it flat with generators, and builds strings the way CPython likes.

## What one object costs: sys.getsizeof

Module 11 introduced `sys.getsizeof`, the size in bytes of one object. The catch for performance
work is that it's **shallow**: for a container, it counts the container's own storage and not the
objects inside it.

```python
import sys

order_ids = [f"ORD-{n:06d}" for n in range(10_000)]
sys.getsizeof(order_ids), sum(sys.getsizeof(order_id) for order_id in order_ids)
```

The list itself is only an array of pointers. The strings it points at are several times bigger,
and they're not in the first number. Lazy objects are a different story again:

```python
import sys

sys.getsizeof(range(1_000_000)), sys.getsizeof(list(range(1_000_000))), sys.getsizeof(n * n for n in range(1_000_000))
```

A `range` stores three numbers however long it is, and a generator stores its paused frame, not
its values. The list stores a million pointers (plus a million int objects that aren't counted).

> [!NOTE]
> The numbers on this page are smaller than on your laptop. The browser runs 32-bit WebAssembly,
> where a pointer is 4 bytes; a 64-bit CPython uses 8, so an empty list is 28 bytes here and 56
> there. The comparisons hold either way.

## What a whole computation costs: tracemalloc

To measure everything a piece of code allocates, including all the objects inside the containers,
use `tracemalloc`. It records every allocation Python makes while it's running, and reports the
current total and the **peak**, the most that was in use at any moment:

```python
import tracemalloc


def total_listed(n):
    amounts = [x * 1.1 for x in range(n)]
    return sum(amounts)


def total_streamed(n):
    return sum(x * 1.1 for x in range(n))


tracemalloc.start()
total_listed(200_000)
listed_peak = tracemalloc.get_traced_memory()[1]
tracemalloc.reset_peak()
total_streamed(200_000)
streamed_peak = tracemalloc.get_traced_memory()[1]
tracemalloc.stop()

f"list: {listed_peak / 1024:,.0f} KiB   generator: {streamed_peak / 1024:,.1f} KiB"
```

`get_traced_memory()` returns `(current, peak)` in bytes, and `reset_peak()` starts a fresh peak
for the next measurement. To see **where** the memory went, take a snapshot and group it by the
line that allocated it:

```python
import tracemalloc

tracemalloc.start()
rows = [{"sku": f"SKU-{n}", "quantity": n % 7} for n in range(20_000)]
snapshot = tracemalloc.take_snapshot()
tracemalloc.stop()

for stat in snapshot.statistics("lineno")[:3]:
    print(stat)
```

Tracing every allocation slows the program down a lot, so switch it on for the part you're
investigating and off again afterwards, and don't time code while it's on.

> [!JS]
> Coming from JavaScript: this is the Memory panel's allocation timeline, as a library you drive
> from code. `tracemalloc` sees only memory allocated through Python, not memory that a C
> extension such as numpy allocates on its own.

## Generators keep memory flat

A list holds all of its items at once. A generator produces one item, hands it on, and forgets it,
so a pipeline of generators holds one item at a time however long its input is. Here's the same
error count over log lines of three sizes, written both ways:

```python
import tracemalloc


def log_lines(n):
    for i in range(n):
        yield f"2026-09-{i % 28 + 1:02d} GET /orders/{i} {500 if i % 13 == 0 else 200}"


def errors_listed(lines):
    parsed = [line.split() for line in lines]
    return sum(1 for day, method, path, status in parsed if status == "500")


def errors_streamed(lines):
    parsed = (line.split() for line in lines)
    return sum(1 for day, method, path, status in parsed if status == "500")


for n in (4_000, 8_000, 16_000):
    for count_errors in (errors_listed, errors_streamed):
        tracemalloc.start()
        count_errors(log_lines(n))
        peak = tracemalloc.get_traced_memory()[1]
        tracemalloc.stop()
        print(f"{count_errors.__name__:<16} {n:>6} lines   peak {peak / 1024:>6,.0f} KiB")
```

The listed version's peak doubles with the input. The streamed version's stays at about a kilobyte,
because the one-character change from `[...]` to `(...)` means no line outlives its own trip
through the pipeline. With a real file, `for line in open(path)` is already lazy, so the whole
chain from disk to total can run in constant memory.

The trade-off is that a generator can be used **once**. It has no `len()`, no indexing, and a
second loop over it finds nothing. If you need the data twice, or need it sorted, you need it in
memory, and that's fine as long as it fits.

```quiz
question: "rows = (parse(line) for line in lines), then total = sum(r.amount for r in rows), then count = len(list(rows)). What is count?"
options:
  - "The number of lines"
  - "0"
  - "It raises TypeError"
answer: 1
explain: The sum consumed the generator. Turning an exhausted generator into a list gives an empty list, so count is 0, with no error to warn you. Keep a list when you need two passes.
```

## Building strings: join, not +

Strings are immutable, so `text = text + line` can't extend `text`: it allocates a new string and
copies everything so far into it. Do that once per line and the copying grows with the square of
the report's length. `"".join(parts)` works out the final size first and copies each part exactly
once. Here are both, plus `+=`, at two sizes:

```python
import time


def invoice_concat(rows):
    text = ""
    for sku, quantity, amount in rows:
        text = text + f"{sku:<10}{quantity:>4}{amount:>10.2f}" + "\n"
    return text


def invoice_plus_equals(rows):
    text = ""
    for sku, quantity, amount in rows:
        text += f"{sku:<10}{quantity:>4}{amount:>10.2f}\n"
    return text


def invoice_join(rows):
    return "".join(f"{sku:<10}{quantity:>4}{amount:>10.2f}\n" for sku, quantity, amount in rows)


for n in (8_000, 16_000):
    rows = [(f"SKU-{i:05d}", i % 7 + 1, i * 0.37 % 90) for i in range(n)]
    times = []
    for build in (invoice_concat, invoice_plus_equals, invoice_join):
        start = time.perf_counter()
        build(rows)
        times.append(f"{build.__name__} {(time.perf_counter() - start) * 1000:5.0f} ms")
    print(n, "  ".join(times))
```

Doubling the rows roughly quadruples `invoice_concat`'s time, and barely moves the other two. Why
is `+=` fast? CPython cheats: when a string has exactly one reference, a local variable, and you
`+=` onto it, it resizes that string in place instead of copying. The trick is real, but fragile:

- `text = text + a + b` builds `text + a` as a new string first, so there's nothing to resize.
- `self.text += line` fails the one-reference test, because the object also refers to the string.
- Other Pythons, such as PyPy, don't do it at all.

So don't rely on it. Collect the pieces in a list, or a generator, and `join` them at the end.
For text written bit by bit across many functions, `io.StringIO` gives the same linear cost with a
file-like `write()`.

> [!JS]
> Coming from JavaScript: V8 represents `a + b` as a "rope" that points at both halves and only
> flattens it later, so `+=` in a loop is cheap in JS. CPython strings are always one flat block of
> memory.

## Where this leaves you

`sys.getsizeof` is shallow; `tracemalloc` sees everything, and its peak is the number that decides
whether a job fits. Generators hold one item at a time, at the price of a single pass. Build big
strings with `join`, not repeated `+`. The drills have you predict sizes, measure a peak, stream a
report, and fix a quadratic invoice builder.
