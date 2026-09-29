---
slug: profiling-with-cprofile
title: Profiling with cProfile
summary: Find where a whole program spends its time with cProfile, read tottime, cumtime and call counts, and know what the profiler distorts.
minutes: 35
exercises:
  - perf-parse-profile-row
  - perf-predict-call-counts
  - perf-hot-function
  - perf-most-called
---

`timeit` answers "how long does this snippet take?". It can't tell you **which** snippet to time.
In a real program, the slow part is often somewhere you'd never have looked: a helper called ten
thousand times, or a check that quietly scans a list. A **profiler** runs the whole program and
reports how much time each function took and how often it was called. Profile first, and you'll
spend your effort on the one function that matters.

## Profiling a function

`cProfile` is the profiler in the standard library. Use it as a context manager around the code
you care about, then hand it to `pstats` to sort and print the results. Here is an order report
that feels slow:

```python
import cProfile
import pstats

KNOWN_SKUS = [f"SKU-{n:04d}" for n in range(2_000)]
ORDER_LINES = [f"SKU-{n * 7 % 2_400:04d},{n % 5 + 1},{n % 40 + 0.99}" for n in range(2_000)]


def parse(line):
    sku, quantity, price = line.split(",")
    return sku, int(quantity), float(price)


def is_known(sku):
    return sku in KNOWN_SKUS


def revenue(lines):
    total = 0.0
    for line in lines:
        sku, quantity, price = parse(line)
        if is_known(sku):
            total += quantity * price
    return round(total, 2)


with cProfile.Profile() as profiler:
    revenue(ORDER_LINES)

pstats.Stats(profiler).sort_stats("tottime").print_stats(6)
```

The output looks like this (your times will differ):

```text
         6004 function calls in 0.190 seconds

   Ordered by: internal time
   List reduced from 7 to 6 due to restriction <6>

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
     2000    0.145    0.000    0.145    0.000 main.py:13(is_known)
     2000    0.018    0.000    0.025    0.000 main.py:8(parse)
        1    0.018    0.018    0.189    0.189 main.py:17(revenue)
     2000    0.007    0.000    0.007    0.000 {method 'split' of 'str' objects}
        1    0.001    0.001    0.001    0.001 {method 'disable' of '_lsprof.Profiler' objects}
        1    0.000    0.000    0.000    0.000 {built-in method builtins.round}
```

Three quarters of the time is in `is_known`, a one-line function nobody would suspect. It scans a
2 000-item list for every order line. (Lesson 3 explains why that's slow and how a set fixes it.)

## Reading the columns

Each row is one function. Built-in functions and methods appear in braces, like
`{method 'split' of 'str' objects}`, and your own functions as `file:line(name)`.

| Column | Means |
|--------|-------|
| `ncalls` | How many times the function was called. `12/3` means 12 calls, 3 of them not from itself: it's recursive. |
| `tottime` | Time spent in the function's **own** code, not counting the functions it called |
| `percall` (first) | `tottime / ncalls` |
| `cumtime` | Time from entering the function to leaving it, **including** everything it called |
| `percall` (second) | `cumtime` divided by the number of non-recursive calls |

The two times answer different questions. `revenue` has a small `tottime` but a `cumtime` covering
the whole run: it's where the time goes *through*, not where it's *spent*. `is_known` has a large
`tottime`, so the time is spent inside it. Note that the list scan doesn't get a row of its own:
`in` is an operator, not a function call, so its cost lands in the `tottime` of the function that
uses it.

```quiz
question: A function has tottime 0.01 s and cumtime 4.2 s. What does that tell you?
options:
  - "It's the hot spot: rewrite it"
  - "Almost all the time is in functions it calls, so look at those"
  - "The profiler's numbers are wrong"
answer: 1
explain: tottime counts only the function's own lines. With 4.19 of 4.2 seconds elsewhere, the cost is in its callees. Sort by tottime to find them.
```

## Sorting and filtering

`sort_stats("tottime")` puts the functions that burn time themselves at the top: that's how you
find the hot spot. `sort_stats("cumulative")` reads top-down instead, from the entry point through
the steps it calls, which is how you find which **part** of a program is slow. `print_stats(n)`
keeps the first `n` rows, and `print_stats("parse")` keeps only rows whose name matches a regular
expression. `print_callers` shows who calls a function, which matters when a helper is used from
several places:

```python
import cProfile
import pstats


def parse(line):
    sku, quantity, price = line.split(",")
    return sku, int(quantity), float(price)


def load(lines):
    return [parse(line) for line in lines]


def count_bulk_orders(lines):
    bulk = 0
    for line in lines:
        if parse(line)[1] > 3:
            bulk += 1
    return bulk


LINES = [f"SKU-{n:04d},{n % 5 + 1},9.99" for n in range(1_000)]

with cProfile.Profile() as profiler:
    load(LINES)
    count_bulk_orders(LINES)

stats = pstats.Stats(profiler)
stats.sort_stats("cumulative").print_stats(3)
stats.print_callers("parse")
```

`parse` was called 2 000 times, half from `load` and half from `count_bulk_orders`. If `parse` were the hot
spot, you'd now know both places that depend on it.

## Profiling a whole script

For a script, you don't need to change the code at all. Run it under `cProfile` from the command
line, sorted however you like, or save the profile to a file and explore it afterwards:

```bash
python -m cProfile -s tottime report.py          # print a profile sorted by tottime
python -m cProfile -o report.prof report.py      # save it instead
python -m pstats report.prof                     # browse it: "sort tottime", "stats 10"
```

A saved `.prof` file also opens in visual tools such as snakeviz, which draws it as nested boxes.
For programs that are already running, or where cProfile's overhead is a problem, a **sampling**
profiler such as py-spy or Scalene looks at the call stack a few hundred times a second instead of
recording every call. It's much cheaper and works on a live process, but it can't count calls.

> [!JS]
> Coming from JavaScript: the Chrome DevTools Performance panel is a sampling profiler, like
> py-spy. cProfile is **deterministic**: it records every single call, so its call counts are exact
> but every call gets slower while it's watching.

## What the profiler distorts

Recording every call costs time on every call. A function that's called a million times and does
very little looks far more expensive under cProfile than it really is:

```python
import cProfile
import time

ORDER_LINES = [f"SKU-{n:04d},{n % 5 + 1},9.99" for n in range(2_000)]


def parse(line):
    sku, quantity, price = line.split(",")
    return sku, int(quantity), float(price)


def parse_all():
    return [parse(line) for line in ORDER_LINES]


start = time.perf_counter()
parse_all()
plain = time.perf_counter() - start

with cProfile.Profile():
    start = time.perf_counter()
    parse_all()
    profiled = time.perf_counter() - start

f"{profiled / plain:.1f}x slower while profiled"
```

So treat a profile as a map of **where** time goes, not a stopwatch. The workflow is:

1. Profile to find the function with the biggest `tottime` (or the step with the biggest `cumtime`).
2. Time that function with `timeit`, without the profiler, to get a clean before-number.
3. Fix it, check the output is still correct, and time it again.
4. Profile again: the hot spot has moved, and the next one may not be worth fixing.

> [!TIP]
> Profile with realistic data. A report profiled on ten rows spends its time importing modules and
> opening files; on a million rows the story is completely different.

## Where this leaves you

`cProfile.Profile()` records every call; `pstats.Stats` sorts and prints them. `tottime` finds the
function that burns time itself, `cumtime` finds the part of the program it goes through, and
`ncalls` shows how often things happen, which is often the real surprise. The drills have you parse
profile output, predict call counts, name the hot function in a real profile, and run cProfile from
your own code.
