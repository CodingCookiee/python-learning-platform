---
slug: numpy-and-beyond
title: Vectorising with numpy, and knowing when to stop
summary: Replace Python loops over numbers with numpy arrays, masks and broadcasting, see when to leave Python for C, Rust or PyPy, and keep optimised code readable.
minutes: 45
exercises:
  - perf-vwap
  - perf-predict-broadcasting
  - perf-price-moves
  - perf-nearest-depot
---

Everything so far has made Python do less work. For number crunching there's a bigger lever: stop
doing the work in Python at all. A loop over a million prices pays the interpreter's per-item cost a
million times. **numpy** stores those prices in one compact block of memory and runs the loop in
C, once, over the whole block. This lesson covers the core of it, what it can't help with, where
to go when even numpy isn't enough, and when to stop optimising.

## Arrays: one type, one block of memory

A Python list of floats is an array of pointers, each to a separate float object with its own
type and reference count. A numpy array holds the raw numbers side by side, all of one **dtype**:

```python
import sys

import numpy as np

prices = [n * 0.01 for n in range(100_000)]
as_array = np.array(prices)

list_bytes = sys.getsizeof(prices) + sum(sys.getsizeof(price) for price in prices)
as_array.dtype, as_array.nbytes, list_bytes
```

Eight bytes per `float64`, nothing else. Compact memory is faster memory: the CPU streams through
it, and C code can apply the same operation to each number without asking what type it is.

> [!JS]
> Coming from JavaScript: a numpy array is a `Float64Array` (or `Int32Array`, and so on) that also
> knows how to do arithmetic on itself. `prices * 1.2` works on the whole array, with no `map`.

## Whole-array arithmetic

Arithmetic between arrays, or between an array and a number, works element by element and returns
a new array. Reductions like `.sum()`, `.mean()` and `.max()` collapse it to one number:

```python
import time

import numpy as np

quantities = np.arange(200_000) % 12 + 1
unit_prices = (np.arange(200_000) % 500 + 99) / 100
quantity_list, price_list = quantities.tolist(), unit_prices.tolist()

start = time.perf_counter()
totals_loop = [q * p for q, p in zip(quantity_list, price_list)]
loop_seconds = time.perf_counter() - start

start = time.perf_counter()
totals = quantities * unit_prices
numpy_seconds = time.perf_counter() - start

np.allclose(totals, totals_loop), totals.sum().round(2), f"numpy is about {loop_seconds / numpy_seconds:.0f}x faster here"
```

This style is called **vectorised** code: you describe the operation on whole arrays, and numpy
does the looping. Functions such as `np.sqrt`, `np.abs`, `np.round` and `np.diff` (differences
between neighbours) all work on whole arrays too. Slicing, `prices[1:]` and `prices[:-1]`, gives a
**view** of the same memory rather than a copy, so comparing each price with the one before it is
free.

## Masks instead of if

A comparison on an array gives an array of booleans, a **mask**. Indexing with a mask keeps the
elements where it's `True`, and `np.where(condition, a, b)` picks between two values element by
element. Together they replace the `if` inside a loop:

```python
import numpy as np

amounts = np.array([120.0, 15.5, 980.0, 42.0, 310.0, 8.99])
big = amounts > 100

big, amounts[big], big.sum(), np.where(big, amounts * 0.95, amounts)
```

`big.sum()` counts the `True`s, because `True` counts as 1. Combine masks with `&` (and), `|`
(or) and `~` (not), with brackets round each comparison: `(amounts > 100) & (amounts < 500)`.
Python's `and` and `or` don't work on arrays.

## Broadcasting

When two arrays have different shapes, numpy tries to **broadcast** them: it compares their shapes
from the right, and a dimension of size 1 stretches to match the other. Here, 3 product prices and
4 discount tiers give a 4 × 3 price table, without a loop and without copying anything:

```python
import numpy as np

list_prices = np.array([8.50, 24.00, 2.35])                  # shape (3,)
tier_discounts = np.array([[0.0], [0.05], [0.10], [0.15]])   # shape (4, 1)

table = list_prices * (1 - tier_discounts)                   # (4, 1) with (3,) gives (4, 3)
table.round(2), table.shape
```

The rules, applied from the last dimension backwards:

1. Two dimensions fit if they're equal, or if one of them is 1.
2. A missing dimension on the left counts as 1, so shape `(3,)` behaves like `(1, 3)`.
3. Anything else is an error: `(4, 3)` with `(4,)` fails, because 3 and 4 don't fit.

`array[:, np.newaxis]` (or `array[:, None]`) turns a shape `(n,)` array into `(n, 1)`, which is
how you set up "every item against every other item" calculations, such as a distance matrix.

```quiz
question: "deliveries has shape (1000, 1) and depots has shape (50,). What shape is deliveries - depots?"
options:
  - "(1000,)"
  - "(1000, 50)"
  - "It raises an error"
answer: 1
explain: "From the right: 1 and 50 fit (the 1 stretches), and (50,) gains a leading 1 that stretches to 1000. The result has one row per delivery and one column per depot."
```

## Where numpy doesn't help

numpy is fast when the loop runs **inside** numpy. Loop over an array in Python and it's slower
than a list, because every element you touch has to be boxed into a new numpy scalar object:

```python
import timeit

import numpy as np

values = list(range(50_000))
array = np.arange(50_000)

list_loop = timeit.timeit(lambda: sum(v * 2 for v in values), number=3)
array_loop = timeit.timeit(lambda: sum(v * 2 for v in array), number=3)
vectorised = timeit.timeit(lambda: (array * 2).sum(), number=3)
f"list loop {list_loop * 1000:.0f} ms, array loop {array_loop * 1000:.0f} ms, vectorised {vectorised * 1000:.1f} ms"
```

The other cases where it doesn't pay:

- **Small data.** Each numpy call has a fixed cost of a microsecond or so. For a dozen numbers, a
  list and `sum()` win.
- **Each step depends on the last one** in a way numpy has no function for, such as "a running
  balance that resets when it goes negative". `np.cumsum` covers the plain running total; for
  anything more tangled you need a loop, and possibly one of the tools below.
- **Strings, dicts and objects.** numpy's speed comes from fixed-size numbers. An array of Python
  objects is just a slower list.

## When Python itself is the bottleneck

Sometimes the profile says the time is in one tight loop of pure computation that doesn't
vectorise. Then it's worth running that loop in something other than CPython's interpreter. An
overview of the options, in roughly the order to consider them:

| Tool | What it is | Good for |
|------|------------|----------|
| An existing library | numpy, pandas, polars, `re`, `hashlib`, `sqlite3` are already C or Rust | Almost everything: someone has usually written the fast version |
| Numba | A JIT compiler: decorate a numeric function with `@njit` and it's compiled to machine code on first call | Numeric loops over numpy arrays, with no new language |
| Cython | Python with optional C types, compiled to a C extension | Speeding up a hot module step by step, wrapping C libraries |
| Rust with PyO3 | Write the function in Rust, build a Python module with `maturin` | New, safe, fast extensions; this is how polars, pydantic-core and orjson are built |
| C or C++ extension | The CPython C API directly, or `pybind11` for C++ | Wrapping existing C/C++ code |
| PyPy | A different Python implementation with a JIT | Long-running pure-Python programs; C extensions can be slower or unsupported |

All of them cost something: a build step, a second language, harder debugging, or a different
runtime to deploy. Reach for them after the data structures and algorithms are right, and only for
the function the profiler points at.

> [!JS]
> Coming from JavaScript: this is where Python and Node differ most. Node's answer to "this loop is
> slow" is usually "V8 will JIT it". Python's is "move the loop into C", whether that's numpy, an
> extension, or a JIT like Numba or PyPy.

## Premature optimisation and readable code

Donald Knuth's famous line is usually quoted as "premature optimization is the root of all evil".
The full sentence matters more: *"We should forget about small efficiencies, say about 97% of the
time: premature optimization is the root of all evil. Yet we should not pass up our opportunities
in that critical 3%."* The whole of this module is about finding that 3% and leaving the other 97%
simple. The working order is:

1. Make it correct, with tests.
2. Make it clear.
3. Measure, with realistic data, and profile to find the hot spot.
4. Fix the hot spot, starting with the algorithm and data structures.
5. Measure again, and stop when it's fast enough for the job.

When you do optimise, keep the old, obviously correct version around as a **reference** and test
the fast version against it on lots of random inputs:

```python
import random
from bisect import bisect_right


def price_at_simple(when, times, prices):
    """Obviously correct, and slow: scan every change."""
    price = None
    for at, change in zip(times, prices):
        if at > when:
            break
        price = change
    return price


def price_at_fast(when, times, prices):
    """O(log n) with bisect. Must agree with price_at_simple."""
    latest = bisect_right(times, when) - 1
    return prices[latest] if latest >= 0 else None


rng = random.Random(7)
for _ in range(500):
    times = sorted(rng.sample(range(100), rng.randint(0, 10)))
    prices = [rng.randint(1, 9) for _ in times]
    when = rng.randint(-5, 105)
    assert price_at_fast(when, times, prices) == price_at_simple(when, times, prices), (when, times)

"the fast and simple versions agree on 500 random cases"
```

And leave a comment where the fast version isn't the obvious one, saying what it replaced and the
measurement that justified it. The next person to read it will otherwise "simplify" it back.

## Where this leaves you

Vectorise number crunching: arrays, whole-array arithmetic, masks and broadcasting move the loop
into C. Don't loop over arrays in Python, and don't use numpy for a handful of values. When a
profiled hot loop still won't vectorise, Numba, Cython, Rust or PyPy can take it, at a cost. And
optimise only what you've measured, against a reference you trust. The drills have you vectorise a
price feed, predict broadcast shapes, and replace a nested loop with a distance matrix.
