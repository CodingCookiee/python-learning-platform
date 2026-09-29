---
slug: measure-first
title: Measure first
summary: Time code with perf_counter and timeit, take the best of several runs, and avoid the mistakes that make benchmarks lie.
minutes: 35
exercises:
  - perf-timed-call
  - perf-predict-timeit-calls
  - perf-best-of-n
  - perf-fair-benchmark
---

A nightly sales report takes forty minutes. Someone rewrites its loops as `map()` calls because
"map is faster", and it still takes forty minutes: the time was going on a lookup three functions
away. Programmers are bad at guessing where time goes, and that includes experienced ones. So the
first rule of performance work is to measure, and to measure again after every change. This lesson
covers the two tools you'll use most, `time.perf_counter()` and `timeit`, and how to stop them
lying to you.

> [!NOTE]
> Every example here runs in your browser, where CPython is compiled to WebAssembly and runs
> several times slower than it does natively. Compare the times with each other, not with numbers
> from your laptop. The ratios hold; the absolute numbers don't.

## Timing one run with perf_counter

`time.perf_counter()` returns a number of seconds from the most precise clock the system has. The
number itself means nothing; the difference between two readings is the elapsed time.

```python
import time

prices = [19.99, 4.50, 12.00, 7.25] * 25_000

start = time.perf_counter()
total = 0
for price in prices:
    total += price
loop_seconds = time.perf_counter() - start

start = time.perf_counter()
total_builtin = sum(prices)
sum_seconds = time.perf_counter() - start

f"loop {loop_seconds * 1000:.1f} ms, sum() {sum_seconds * 1000:.1f} ms"
```

Use `perf_counter`, not `time.time()`. `time.time()` is the wall clock: it can jump when the system
syncs with a time server, and on some systems it only ticks every few milliseconds. `perf_counter`
never goes backwards and has the finest resolution available.

> [!JS]
> Coming from JavaScript: `time.perf_counter()` is `performance.now()`, but in seconds rather than
> milliseconds. There's no built-in `console.time()`; a `with` block around two `perf_counter()`
> calls is the usual replacement.

One reading is fine for something that takes seconds, like a whole report. For anything that takes
microseconds, a single run is mostly noise.

## Timing small snippets with timeit

The `timeit` module runs a piece of code many times and returns the **total** time for all the
runs. Pass it a function (or a lambda) and how many times to call it:

```python
import timeit

prices = [19.99, 4.50, 12.00, 7.25] * 2_500


def loop_total():
    total = 0
    for price in prices:
        total += price
    return total


loop = timeit.timeit(loop_total, number=50)
builtin = timeit.timeit(lambda: sum(prices), number=50)
f"sum() is about {loop / builtin:.0f}x faster here"
```

`timeit` can also take the code as a string, which avoids the small cost of calling a lambda. The
string runs in its own namespace, so hand it your names with `globals=`:

```python
import timeit

prices = [19.99, 4.50, 12.00, 7.25] * 2_500
timeit.timeit("sum(prices)", globals=globals(), number=50)
```

`setup=` is code that runs once before the timed loop, for building data you don't want to time.
Divide the total by `number` when you want the time per call.

## Repeat, and keep the best run

A single `timeit` call is one sample. Anything else happening on the machine, a garbage collection
pass or another program, can only make a run slower, never faster. `timeit.repeat` takes several
samples, and the **minimum** is the best estimate of what your code itself costs:

```python
import timeit

order_ids = [f"ORD-{n:05d}" for n in range(5_000)]
runs = timeit.repeat(lambda: sorted(order_ids, reverse=True), number=20, repeat=5)

[f"{run * 1000:.1f} ms" for run in runs], f"best: {min(runs) / 20 * 1000:.2f} ms per call"
```

The runs differ even though the work is identical. That spread is noise, and it's why you should
never compare one run of version A against one run of version B.

```quiz
question: Why does timeit's documentation suggest taking the minimum of the repeated runs, not the mean?
options:
  - "The minimum is always the first run, which has the coldest caches"
  - "Interference only ever adds time, so the fastest run is closest to the code's real cost"
  - "The mean is too slow to compute"
answer: 1
explain: Other processes, garbage collection and cache misses can only slow a run down. The fastest run has the least of that noise in it. The mean is still the right figure when you want to know what users experience, noise included.
```

## Mistakes that make benchmarks lie

Most wrong conclusions about speed come from a benchmark measuring something other than what its
author thought. The classic is code that changes its own input:

```python
import random
import timeit

rng = random.Random(42)
latencies = [rng.random() for _ in range(20_000)]

fair = timeit.repeat(lambda: sorted(latencies), number=1, repeat=4)
unfair = timeit.repeat(lambda: latencies.sort(), number=1, repeat=4)
[f"{t * 1000:.1f}" for t in fair], [f"{t * 1000:.1f}" for t in unfair]
```

`sorted()` makes a new list each time, so every run sorts the same random data. `list.sort()` sorts
in place, so only the first run sorts random data; the next three sort a list that's already in
order, which Python's sort handles in a single pass. Conclude from this that `sort()` is much faster
than `sorted()` and you'd be wrong. The fix is to hand every run a fresh copy, made **outside** the
timed part.

The other usual suspects:

- **Timing the setup.** Building a 100 000-row test list inside the timed function means you're
  measuring the list, not your code. Build it once, outside.
- **Inputs that are too small.** On ten items, everything takes a microsecond and call overhead
  dominates. Time with data the size you really have.
- **A cold first run.** The first call can pay for imports, caches filling, and CPython's
  specialising interpreter rewriting hot bytecode. `repeat` plus the minimum handles this.
- **Printing or logging inside the timed code.** Output is slow, and it isn't what you meant to time.

## Why a Python loop costs what it does

CPython compiles your function to **bytecode** and runs it on an interpreter loop, one small
instruction at a time. `dis` shows the instructions:

```python
import dis


def with_tax(prices, rate):
    return [price * (1 + rate) for price in prices]


dis.dis(with_tax)
```

Every pass round that comprehension runs about ten instructions. Each one is fetched and
dispatched, `BINARY_OP` checks the types of both sides at run time, and each result is a brand-new
float object on the heap. That overhead is paid **per item**. `sum()`, `sorted()`, `set()` and
`str.join()` are written in C, so their inner loop pays none of it, which is why the built-in won
by such a margin in the first example. Much of this module is about moving the per-item work out of
Python bytecode and into C.

> [!JS]
> Coming from JavaScript: V8 watches your hot loops and compiles them to machine code, so a plain
> `for` loop is fast. CPython 3.11+ specialises bytecode as it runs, and 3.13 added an experimental
> JIT (the 3.14 Windows and macOS installers include it, switched off unless you set `PYTHON_JIT=1`),
> but the gains so far are modest. Don't expect Python to speed up a loop for you.

## Where this leaves you

Use `perf_counter` for one run of something big and `timeit.repeat` with the minimum for anything
small. Give every run the same input, keep setup out of the timed part, and compare ratios, not
absolute numbers. Built-ins are fast because their loop runs in C. The drills have you write a
timing helper, predict exactly what `timeit` runs, and repair a benchmark that measures the wrong
thing.
