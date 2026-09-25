---
slug: stdlib-itertools
title: The itertools module
summary: Chain, slice, combine, total, batch, pair and group data without writing index arithmetic or nested loops.
minutes: 40
exercises:
  - itertools-running-total
  - itertools-predict-groupby
  - itertools-fix-groupby
  - itertools-batch-uploads
  - itertools-refactor-pairs
  - itertools-longest-outage
---

A lot of loop code is bookkeeping: `range(len(items) - 1)` to reach the next item, a counter to split
a list into chunks, three nested loops to try every combination. `itertools` replaces that
bookkeeping with small functions whose names say what the loop was for. This lesson covers the seven
you'll use most.

## Iterators are lazy

Every `itertools` function returns an **iterator**: an object that produces values one at a time,
only when asked, instead of building a list up front. That's why they work on huge inputs, and it's
why you'll see `list(...)` around them in the examples: it asks for every value at once, so you can
see them.

An iterator can be used up. Once it has handed over its values, it's empty:

```python
from itertools import chain

combined = chain(["A1", "A2"], ["P1"])
combined, list(combined), list(combined)
```

The first `list()` took all three order ids, so the second got nothing. If you need the values twice,
keep the list, not the iterator.

## Joining with chain

`chain(a, b, c)` walks through several iterables as if they were one, without copying them into a new
list first:

```python
from itertools import chain

web_orders = ["A1", "A2"]
phone_orders = ["P1"]
shop_orders = ["S1", "S2"]
list(chain(web_orders, phone_orders, shop_orders))
```

When the iterables are themselves in a list, such as the pages each visitor opened,
`chain.from_iterable` flattens one level:

```python
from itertools import chain

pages_per_visit = [["/home", "/shop"], ["/cart"], [], ["/checkout", "/thanks"]]
list(chain.from_iterable(pages_per_visit))
```

## Taking part of a stream with islice

Slicing with `[:3]` needs a sequence that knows its length, so it fails on an iterator:

```python raises
log_lines = iter(["GET /", "GET /cart", "POST /pay"])
log_lines[:2]
```

`islice(iterable, stop)` or `islice(iterable, start, stop)` gives the same result for anything you
can loop over, and it only reads as far as it needs to. Because the iterator remembers where it
stopped, a second `islice` carries on from there:

```python
from itertools import islice

log_lines = iter([f"request {n}" for n in range(1, 1001)])
first_page = list(islice(log_lines, 3))
next_page = list(islice(log_lines, 2))
first_page, next_page
```

## Every combination with product

Nested loops that pair every item of one list with every item of another are a **Cartesian
product**. `product` does it in one line, and the order is the same as the nested loops (the last
iterable changes fastest):

```python
from itertools import product

sizes = ["S", "M", "L"]
colours = ["red", "blue"]
[f"{size}-{colour}" for size, colour in product(sizes, colours)]
```

`repeat=` combines an iterable with itself, which is handy for trying every combination of feature
flags in a test:

```python
from itertools import product

list(product([True, False], repeat=2))
```

## Running totals with accumulate

`accumulate` returns the running total: each value added to everything before it. Pass a two-argument
function to combine differently, for example `max` for a running maximum, and `initial=` to start
from something other than the first value:

```python
from itertools import accumulate

daily_signups = [12, 30, 8, 25]
balance_changes = [120, -40, 75]

(
    list(accumulate(daily_signups)),
    list(accumulate(daily_signups, max)),
    list(accumulate(balance_changes, initial=500)),
)
```

## Chunks with batched

APIs often accept at most N records per request. `batched(iterable, n)` splits anything into tuples
of `n` items, with a shorter tuple at the end if the items don't divide evenly:

```python
from itertools import batched

recipients = [
    "ada@example.com", "grace@example.com", "linus@example.com",
    "guido@example.com", "barbara@example.com",
]
list(batched(recipients, 2))
```

If a short last batch would be a bug, for example when every record must be a pair of lines, pass
`strict=True` and it raises instead:

```python raises
from itertools import batched

list(batched(["name: Ada", "email: ada@example.com", "name: Grace"], 2, strict=True))
```

## Neighbours with pairwise

`pairwise` gives each item together with the one after it. It replaces the `for i in
range(len(items) - 1)` loop, and it has no off-by-one to get wrong:

```python
from itertools import pairwise

visit_times = [0, 30, 45, 400, 410]   # seconds since the session started
[later - earlier for earlier, later in pairwise(visit_times)]
```

A list of five times gives four gaps. A list with fewer than two items gives none, with no special
case needed.

```quiz
question: How many pairs does pairwise(["A1", "A2", "A3", "A4"]) produce?
options:
  - "2"
  - "3"
  - "4"
answer: 1
explain: "Each item is paired with the next one: (A1, A2), (A2, A3), (A3, A4). Four items have three neighbouring pairs."
```

## Grouping runs with groupby

`groupby` groups **consecutive** items that share a key. That's perfect for runs, such as how long a
service stayed up or down:

```python
from itertools import groupby

health_checks = ["up", "up", "down", "down", "down", "up"]
[(status, len(list(run))) for status, run in groupby(health_checks)]
```

It is also the most common `itertools` bug. Because it only looks at neighbours, grouping unsorted
data gives the same key more than once:

```python
from itertools import groupby
from operator import itemgetter

orders = [
    {"customer": "ada", "total": 20},
    {"customer": "grace", "total": 15},
    {"customer": "ada", "total": 5},
]
by_customer = itemgetter("customer")
[(name, [o["total"] for o in group]) for name, group in groupby(orders, key=by_customer)]
```

Ada appears twice, and code that builds a dict from this silently keeps only her last group. The fix
is to **sort by the same key first**, so that equal keys sit next to each other:

```python
from itertools import groupby
from operator import itemgetter

orders = [
    {"customer": "ada", "total": 20},
    {"customer": "grace", "total": 15},
    {"customer": "ada", "total": 5},
]
by_customer = itemgetter("customer")
ordered = sorted(orders, key=by_customer)
{name: sum(o["total"] for o in group) for name, group in groupby(ordered, key=by_customer)}
```

> [!TIP]
> `operator.itemgetter("customer")` builds the same function as `lambda o: o["customer"]`. It's a
> common way to write sort and group keys.

> [!JS]
> Coming from JavaScript: lodash's `_.groupBy` (and `Object.groupBy`) collects every matching item
> into one bucket, like `defaultdict(list)`. `itertools.groupby` only groups neighbours.

Each `group` is an iterator that shares its data with the `groupby` itself. Turn it into a list (or
use it up) before moving on to the next group, because moving on empties it.

```quiz
question: "What is [key for key, _ in groupby('aabbba')]?"
options:
  - "['a', 'b']"
  - "['a', 'b', 'a']"
  - "['a', 'a', 'b', 'b', 'b', 'a']"
answer: 1
explain: groupby starts a new group every time the key changes. The string has three runs, aa, bbb and a, so there are three keys, and 'a' appears twice.
```

## Where this leaves you

`chain` joins, `islice` takes part of a stream, `product` replaces nested loops, `accumulate` keeps
running totals, `batched` chunks, `pairwise` pairs neighbours, and `groupby` groups runs, but only
after you sort when you want every equal key together. The drills include a `groupby` bug to fix and
a refactor that deletes some `range(len(...))` loops.
