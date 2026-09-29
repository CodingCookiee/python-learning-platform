---
slug: cost-of-operations
title: What operations really cost
summary: How the cost of list, set, dict and deque operations grows with the data, why hashing wins, and how to pick the structure that makes a loop fast.
minutes: 40
exercises:
  - perf-predict-eq-calls
  - perf-held-orders
  - perf-ticket-queue
  - perf-revenue-by-country
  - perf-price-at-trade
---

The profile in the last lesson pinned the time on a one-line function, `sku in KNOWN_SKUS`. That
line looks harmless, and on 20 SKUs it is. On 2 000 SKUs, checked for every order, it was most of
the run. Code rarely gets slow because a line is slow; it gets slow because a line's cost **grows**
with the data and runs inside a loop that also grows. This lesson is about seeing that growth
before it hurts.

## How cost grows

**Big O** notation describes how the work grows as the input grows, ignoring constant factors:

| Name | Doubling the data… | Example |
|------|--------------------|---------|
| O(1), constant | …changes nothing | `len(items)`, `key in a_dict` |
| O(log n) | …adds one step | a binary search with `bisect` |
| O(n), linear | …doubles the time | `x in a_list`, `sum(items)` |
| O(n log n) | …slightly more than doubles it | `sorted(items)` |
| O(n²), quadratic | …quadruples it | an O(n) check inside a loop over the data |

The quickest way to find out which you have is to double the input and watch the time. Here's a
membership check against a list and a set of order IDs:

```python
import timeit


def lookup_times(n):
    order_ids = [f"ORD-{i:06d}" for i in range(n)]
    order_set = set(order_ids)
    missing = "ORD-999999"
    as_list = timeit.timeit(lambda: missing in order_ids, number=200)
    as_set = timeit.timeit(lambda: missing in order_set, number=200)
    return as_list, as_set


for n in (1_000, 2_000, 4_000, 8_000):
    as_list, as_set = lookup_times(n)
    print(f"{n:>5} ids   list {as_list * 1000:6.2f} ms   set {as_set * 1000:5.3f} ms")
```

The list's time roughly doubles with each row; the set's barely moves. Put the list check inside a
loop over 8 000 orders and the whole job is O(n²): 8 000 × 8 000 comparisons.

## Why a set doesn't have to look

`x in a_list` compares `x` with each item in turn until one is equal. A set (and a dict) is a
**hash table**. Adding an item computes its **hash**, a number derived from its value, and uses
that number to pick a slot in an internal array. Looking an item up computes the same hash, goes
straight to the same slot, and compares only what's there:

```python
order_id = "ORD-000042"
slots = 8
hash(order_id), hash(order_id) % slots
```

(Your numbers will differ from run to run: Python salts string hashes per process, so attackers
can't craft keys that all land in one slot.) The cost of a lookup doesn't depend on how many items
the set holds, so it's O(1) on average. The price is that items must be hashable, so no lists or
dicts inside a set, and a set uses more memory than a list.

> [!JS]
> Coming from JavaScript: it's the same story as `array.includes(x)` against `set.has(x)`. A
> Python `dict` is a hash table just like a `Map`, and keeps insertion order in the same way.

Building a set from a list is itself O(n), because every item has to be hashed. For a single
lookup, scanning the list is cheaper. Convert once, **outside** the loop, when you're going to
look up many times.

```quiz
question: A function checks 10 000 incoming order IDs against a list of 50 000 blocked customer IDs, one at a time. What's the fix?
options:
  - "Sort the blocked list first"
  - "Build set(blocked) once before the loop, then check against the set"
  - "Build set(blocked) inside the loop, just before each check"
answer: 1
explain: One O(n) conversion, then 10 000 O(1) lookups. Converting inside the loop repeats the O(n) work 10 000 times, which is slower than the list you started with.
```

## Dicts turn searches into lookups

The same idea fixes the most common slow loop in business code: finding a record by searching a
list for it. Every order below looks up its customer's country by scanning the customer list,
against building a dict index once:

```python
import time

customers = [{"id": f"C{n:05d}", "country": ["GB", "DE", "FR", "NL"][n % 4]} for n in range(2_000)]
orders = [{"customer_id": f"C{n * 7 % 2_000:05d}", "amount": n % 90 + 10} for n in range(400)]


def country_by_scan(customer_id):
    for customer in customers:
        if customer["id"] == customer_id:
            return customer["country"]


start = time.perf_counter()
by_scan = [country_by_scan(order["customer_id"]) for order in orders]
scan_seconds = time.perf_counter() - start

start = time.perf_counter()
country_of = {customer["id"]: customer["country"] for customer in customers}
by_index = [country_of[order["customer_id"]] for order in orders]
index_seconds = time.perf_counter() - start

by_scan == by_index, f"the dict is about {scan_seconds / index_seconds:.0f}x faster, building it included"
```

The scan is worse than the list membership check from earlier: its inner loop is Python code, so
every comparison pays the interpreter's per-step cost, not just C's. Whenever you see a loop
searching for "the one where `id` matches", build a dict keyed on `id`.

## Both ends of a sequence

A list is a contiguous array of pointers. Adding or removing at the **end** is O(1) (on average:
now and then the array is reallocated with room to spare). Adding or removing at the **front** has
to shift every other pointer along by one, which is O(n). `collections.deque` is built from linked
blocks, so both ends are O(1):

```python
import timeit
from collections import deque


def newest_first_list(ticks):
    feed = []
    for price in ticks:
        feed.insert(0, price)
    return feed


def newest_first_deque(ticks):
    feed = deque()
    for price in ticks:
        feed.appendleft(price)
    return feed


for n in (5_000, 10_000, 20_000):
    ticks = list(range(n))
    as_list = timeit.timeit(lambda: newest_first_list(ticks), number=1)
    as_deque = timeit.timeit(lambda: newest_first_deque(ticks), number=1)
    print(f"{n:>6} ticks   list {as_list * 1000:6.1f} ms   deque {as_deque * 1000:5.1f} ms")
```

The shift is a single fast memory copy, so the list only falls behind with tens of thousands of
items. But it falls behind quadratically, and a queue in a long-running service gets there. The
trade-off: indexing into the middle of a deque, `feed[5_000]`, is O(n), where a list's is O(1).

## The cost table

The costs worth knowing by heart, for CPython:

| Operation | list | set / dict | deque |
|-----------|------|------------|-------|
| `x in c` | O(n) | O(1) | O(n) |
| `c[i]` / `d[key]` | O(1) | O(1) | O(n) in the middle |
| append at the end | O(1) | O(1) (`add`, `d[k] = v`) | O(1) |
| add or remove at the front | O(n) | n/a | O(1) |
| remove a given value | O(n) (`remove`) | O(1) (`discard`, `del`) | O(n) |
| `len(c)` | O(1) | O(1) | O(1) |
| sort | O(n log n) | n/a | n/a |

Some others that catch people out: slicing `items[a:b]` copies, so it's O(b − a); `min`, `max`,
`sum`, `list.index` and `list.count` are all O(n); `sorted()` is O(n log n) each time you call it;
and `text in long_string` scans the string.

## Choosing a structure for the job

Most performance fixes come from asking what the loop actually needs to do with the data:

- **Is this one here?** or **remove duplicates**: a `set`. `dict.fromkeys(items)` deduplicates
  while keeping the first-seen order.
- **Find the record for this key**: a `dict` built once.
- **Take from one end, add at the other** (queues, recent items): a `deque`.
- **The biggest or smallest few**: `heapq.nlargest(k, items)` is O(n log k), cheaper than sorting
  everything to take `k`.
- **Which band or range does this value fall in?**: a sorted list and `bisect`, O(log n) per lookup.

```python
from bisect import bisect_left

# Upper weight limit of each parcel band in kg, and the band's price
limits = [0.5, 1, 2, 5, 10, 20]
prices = [2.95, 3.95, 5.50, 8.20, 12.00, 18.50]


def shipping_price(weight_kg):
    band = bisect_left(limits, weight_kg)   # the first band whose limit is >= weight
    return prices[band]


[shipping_price(w) for w in (0.2, 0.5, 0.51, 4.0, 19.9)]
```

`bisect_left` halves the search range at each step, so it finds the band among a million limits in
about twenty comparisons. It needs the list sorted, which costs O(n log n) once.

## Where this leaves you

Cost that grows with the data, inside a loop that also grows, is where slow code comes from. Sets
and dicts hash straight to the answer; lists scan; deques are cheap at both ends; `bisect` and
`heapq` handle ranges and top-k. Double the input to see the growth for yourself. The drills have
you count comparisons, turn scans into lookups, and fix code the time limit will catch.
