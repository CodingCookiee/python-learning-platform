---
slug: caching-and-repeated-work
title: Caching and repeated work
summary: Make code faster by not running it twice, with caches, hoisting and precomputed tables, and know when a cache hands back wrong answers.
minutes: 40
exercises:
  - perf-predict-lru-evictions
  - perf-courier-routes
  - perf-hoist-gold-customers
  - perf-cached-zones-fix
  - perf-ttl-cache
---

The fastest code is code that doesn't run. A surprising amount of slow Python computes the same
answer over and over: the same delivery estimate for every order to the same postcode, the same
average for every row of a table, the same set rebuilt on every pass round a loop. There are two
ways to stop: **remember** answers you've already worked out (caching), and **move** work to where
it only happens once (hoisting and precomputing).

## Remembering answers

Module 4 introduced `functools.cache`. Here it is doing a performance job. A warehouse works out
how many business days each order took to deliver, and most orders share their dates:

```python
import time
from datetime import date, timedelta
from functools import cache

HOLIDAYS = {date(2026, 12, 25), date(2026, 12, 28), date(2027, 1, 1)}


def business_days(start, end):
    """Working days after start, up to and including end."""
    days = 0
    current = start
    while current < end:
        current += timedelta(days=1)
        if current.weekday() < 5 and current not in HOLIDAYS:
            days += 1
    return days


orders = [(date(2026, 12, 1 + n % 20), date(2026, 12, 21) + timedelta(days=n % 14)) for n in range(3_000)]

start = time.perf_counter()
plain = [business_days(placed, delivered) for placed, delivered in orders]
plain_seconds = time.perf_counter() - start

cached_business_days = cache(business_days)
start = time.perf_counter()
cached = [cached_business_days(placed, delivered) for placed, delivered in orders]
cached_seconds = time.perf_counter() - start

print(plain == cached, f"about {plain_seconds / cached_seconds:.0f}x faster")
cached_business_days.cache_info()
```

`cache_info()` is the number to look at: 3 000 calls, but only 140 different pairs of dates, so 140
misses did the real work and the other 2 860 were dictionary lookups. A cache pays off exactly when
the **hit rate** is high and each miss is expensive.

`cache(fn)` without the `@` gives a cached version while keeping the original, which is handy for
a before-and-after comparison like this one.

## What a cache costs

A cache isn't free. Every call builds a key from the arguments, hashes it and looks it up. When the
function itself is trivial, that bookkeeping costs more than just doing the work:

```python
import timeit
from functools import cache


def vat(amount):
    return amount * 0.2


cached_vat = cache(vat)
amounts = [n % 500 / 4 for n in range(10_000)]

plain = min(timeit.repeat(lambda: [vat(a) for a in amounts], number=5, repeat=3))
cached = min(timeit.repeat(lambda: [cached_vat(a) for a in amounts], number=5, repeat=3))
f"with the cache, it takes {cached / plain:.1f}x as long"
```

Every one of those calls after the first 500 is a cache hit, and it's still slower. The other cost
is memory: `@cache` keeps every answer for as long as the program runs. For a function called with
endless different arguments (timestamps, order IDs, free text), that's a slow memory leak. Give it
a limit with `@lru_cache(maxsize=1024)`, which throws away the least recently used answer when it's
full.

```quiz
question: Which of these is the best candidate for @cache?
options:
  - "format_price(amount), called once per order line with thousands of different amounts"
  - "distance_km(depot, postcode), a slow calculation, called for every order, with 40 depots and 300 postcodes"
  - "current_stock(sku), which reads today's stock from a dict that changes during the day"
answer: 1
explain: At most 12 000 different pairs, each slow to compute and asked for again and again. format_price is cheap and rarely repeats its arguments; current_stock depends on data outside its arguments, so a cache would return stale stock.
```

## When a cache gives wrong answers

A cache is only correct for a **pure** function: one whose answer depends on its arguments and
nothing else, and which doesn't change anything. The ways that goes wrong:

- **It reads something that changes.** A cached `stock_level(sku)` returns this morning's stock all
  day. Anything that reads the clock, a file, a database, a global or `random` is out.
- **It returns something mutable.** Every caller gets the *same* object back, so one caller's
  change reaches all the others:

```python
from functools import cache


@cache
def default_tags(category):
    return ["new", category]


tags = default_tags("mugs")
tags.append("sale")          # one product page adds a tag for itself...
default_tags("mugs")         # ...and every product that asks later gets it too
```

Return a tuple or a frozenset from a cached function, and let callers make their own list.

- **It's a method.** `@lru_cache` on a method caches on `self`, so the cache keeps every instance
  it has seen alive until the program exits. For a value computed once per object, use
  `functools.cached_property`, which stores the answer on the instance itself:

```python
from functools import cached_property


class Invoice:
    def __init__(self, lines):
        self.lines = lines

    @cached_property
    def total(self):
        print("adding up", len(self.lines), "lines")
        return sum(quantity * price for quantity, price in self.lines)


invoice = Invoice([(2, 8.50), (1, 24.00)])
invoice.total, invoice.total
```

It computed once and remembered. If `lines` could change, the cached total would go stale; `del
invoice.total` clears it.

## Hoisting work out of loops

A **loop-invariant** is a calculation inside a loop whose answer is the same on every pass.
Moving it above the loop is called hoisting, and it's the single most common speed fix there is.
This one hides inside a comprehension's condition:

```python
import time

prices = [n * 7_919 % 10_000 / 100 for n in range(3_000)]


def above_average_slow(prices):
    return [price for price in prices if price > sum(prices) / len(prices)]


def above_average(prices):
    average = sum(prices) / len(prices)   # worked out once, not once per price
    return [price for price in prices if price > average]


start = time.perf_counter()
slow = above_average_slow(prices)
slow_seconds = time.perf_counter() - start

start = time.perf_counter()
fast = above_average(prices)
fast_seconds = time.perf_counter() - start

slow == fast, f"about {slow_seconds / fast_seconds:.0f}x faster"
```

The slow version sums all 3 000 prices for each of the 3 000 prices: nine million additions for an
answer that never changes. Look for these inside loops: `sum`, `len`, `max`, `sorted`, `set(...)`,
building a dict, `re.compile`, parsing a config string, or calling a function that does any of
those. If it doesn't use the loop variable, it probably belongs above the loop.

## Precomputing

Sometimes the repeated work isn't identical, but it can all be answered from one table built in
advance. A revenue dashboard that answers "total between day A and day B" for hundreds of date
ranges doesn't need to add up each range from scratch. Build running totals once, and each
question is a subtraction:

```python
from itertools import accumulate

daily_revenue = [n * 37 % 500 + 100 for n in range(365)]
running = [0, *accumulate(daily_revenue)]   # running[d] is the total of the first d days


def revenue_between(first_day, last_day):
    return running[last_day + 1] - running[first_day]


revenue_between(0, 6), sum(daily_revenue[0:7]), revenue_between(100, 199)
```

Building the table is O(n), once; every question after that is O(1). The dict indexes from the last
lesson are the same trade: pay once up front, then answer quickly as often as you like.

## Local names, and when micro-optimisation matters

Inside a function, a local variable is found by position in an array. A global is a dictionary
lookup, and `math.sqrt` is a global lookup plus an attribute lookup. So binding a hot function to a
local name before a loop used to be a well-known trick:

```python
import math
import timeit

points = [(n % 100, n % 37) for n in range(10_000)]


def distances_global():
    return [math.sqrt(x * x + y * y) for x, y in points]


def distances_local():
    sqrt = math.sqrt
    return [sqrt(x * x + y * y) for x, y in points]


with_global = min(timeit.repeat(distances_global, number=3, repeat=3))
with_local = min(timeit.repeat(distances_local, number=3, repeat=3))
f"the local name saves {100 * (1 - with_local / with_global):.0f}%"
```

Run it a few times. The saving is somewhere between nothing and a fifth, and it jumps around,
because CPython 3.11+ caches global and attribute lookups in its specialising interpreter. Compare
that with hoisting the sum, which made the code hundreds of times faster. Tricks like this are worth it only in a loop
that the profiler has shown runs millions of times, after the bigger fixes are done, and with a
comment saying why.

> [!JS]
> Coming from JavaScript: V8's inline caches make property lookups in hot code nearly free, so JS
> developers rarely think about this. CPython's specialising interpreter does something similar, but
> each lookup is still interpreted, so there's a little left to gain.

## Where this leaves you

Cache pure functions with expensive misses and a high hit rate, bound the cache when arguments
vary, and never cache anything that reads changing data or returns something callers will mutate.
Hoist loop-invariants, precompute tables for repeated questions, and leave micro-optimisations for
last. The drills have you predict evictions, memoise a search, hoist a hidden loop, fix a cache that
leaks changes, and build a cache that expires.
