---
slug: functools-statistics-random
title: functools, statistics and random
summary: Pre-fill arguments, fold a list into one value, cache slow answers, then summarise numbers and make randomness testable.
minutes: 40
exercises:
  - functools-uk-price
  - functools-predict-cache
  - functools-discount-pipeline
  - functools-fix-slow-routes
  - stats-delivery-report
  - random-raffle-draw
---

Module 3 showed that functions are values: you can pass them around, return them and store them.
`functools` is the standard library's toolbox for working with functions as values. This lesson
covers its three most useful tools, then two modules for working with numbers: `statistics` for
summarising them and `random` for picking them, in a way you can still test.

## Pre-filling arguments with partial

You often need a version of a function with some arguments already decided: the UK price
calculator is the price calculator with the rate fixed at 20%. You could write a wrapper `def`, or a
`lambda`. `functools.partial` says it directly:

```python
from functools import partial


def price_with_tax(net, rate):
    return round(net * (1 + rate), 2)


uk_price = partial(price_with_tax, rate=0.20)
de_price = partial(price_with_tax, rate=0.19)
uk_price(10), de_price(10), uk_price.keywords
```

A partial object remembers the function and the arguments you gave it, and adds the rest when it's
called. It's especially neat where another function wants a one-argument function, such as `map()`
or a `key=`:

```python
from functools import partial

parse_hex = partial(int, base=16)
list(map(parse_hex, ["ff", "1a", "07"]))
```

> [!TIP]
> New in Python 3.14: `functools.Placeholder` reserves a positional slot, for functions whose
> arguments can't be passed by keyword. `partial(str.replace, Placeholder, "-", "_")` makes a
> function that swaps dashes for underscores in whatever string you give it.

## Folding a list with reduce

`reduce(function, items, initial)` combines items one at a time: it calls `function(initial,
first)`, then calls `function` again with that result and the second item, and so on until one value
is left. `sum()` is a reduce that adds. `reduce` is for combining steps that have no built-in, such
as running a price through a list of adjustments:

```python
from functools import reduce

adjustments = [
    lambda price: price - 5,        # a 5.00 voucher
    lambda price: price * 0.9,      # 10% loyalty discount
    lambda price: round(price, 2),
]
reduce(lambda price, step: step(price), adjustments, 50)
```

Here `50 - 5` gives `45`, then `45 * 0.9` gives `40.5`, and rounding leaves `40.5`. Merging a list of
dicts with `|` works the same way, with `operator.or_` as the combining function:

```python
from functools import reduce
from operator import or_

regional_stock = [{"uk": 12}, {"de": 7}, {"uk": 15, "fr": 3}]
reduce(or_, regional_stock)
```

> [!WARNING]
> Reach for `reduce` last. If `sum`, `max`, `min`, `math.prod`, `any`, `all` or `"".join` does the job,
> use it: everyone can read those at a glance, and a `reduce` with a clever lambda takes a minute to
> decode.

## Remembering answers with cache

Some functions are slow and get called with the same arguments again and again. Here is one that
counts how many ways an order for drinks can be made up from packs of 1, 6, 12 and 24 bottles. It
calls itself, and counts how often it does:

```python
calls = 0


def pack_combinations(quantity, sizes=(1, 6, 12, 24)):
    global calls
    calls += 1
    if quantity == 0:
        return 1
    if quantity < 0 or not sizes:
        return 0
    # Either use one more of the largest pack, or never use that pack again
    return pack_combinations(quantity - sizes[-1], sizes) + pack_combinations(quantity, sizes[:-1])


pack_combinations(120), calls
```

Nearly twenty thousand calls to get 286, because the same sub-questions ("how many ways to make 48
from packs of 1 and 6?") are answered over and over. Add `@cache` above the `def` and each answer is
worked out once and remembered:

```python
from functools import cache

calls = 0


@cache
def pack_combinations(quantity, sizes=(1, 6, 12, 24)):
    global calls
    calls += 1
    if quantity == 0:
        return 1
    if quantity < 0 or not sizes:
        return 0
    return pack_combinations(quantity - sizes[-1], sizes) + pack_combinations(quantity, sizes[:-1])


pack_combinations(120), calls, pack_combinations.cache_info()
```

The `@` line is a **decorator**: it wraps the function in a new one that looks the arguments up in a
dict before calling the original. Module 8 shows how to write your own. `cache_info()` reports hits
(answers served from the cache) and misses (answers worked out).

`cache` keeps every answer forever. `@lru_cache(maxsize=256)` keeps only the 256 most recently used
answers, which is safer for a function called with endlessly different arguments.

Because the arguments become dict keys, they must be hashable. A list isn't:

```python raises
from functools import cache


@cache
def order_total(prices):
    return sum(prices)


order_total([4.5, 12.0, 3.25])
```

Pass a tuple (or a `frozenset` instead of a set) and it works.

> [!WARNING]
> Only cache functions whose answer depends on nothing but their arguments. A cached
> `exchange_rate("GBP")` would return the first rate it fetched for as long as the program runs.

## Summarising numbers with statistics

`statistics` has the summaries you'd otherwise write by hand, and the median is often the one you
want. One lost parcel drags the mean delivery time up by half a day; the median barely notices:

```python
import statistics

delivery_hours = [20, 22, 24, 23, 21, 96]
round(statistics.mean(delivery_hours), 1), statistics.median(delivery_hours)
```

`mode` is the most common value, `stdev` measures how spread out the values are (as a sample of a
larger population), and `quantiles(data, n=4)` returns the cut points that split the data into four
equal groups, whose middle one is the median:

```python
import statistics

delivery_hours = [20, 22, 24, 23, 21, 96, 22]
(
    statistics.mode(delivery_hours),
    round(statistics.stdev(delivery_hours), 1),
    statistics.quantiles(delivery_hours, n=4),
)
```

With no data there is nothing to summarise, and `statistics` raises `StatisticsError` (a kind of
`ValueError`) rather than inventing an answer:

```python raises
import statistics

statistics.mean([])
```

## Randomness you can test

The `random` module picks things: `choice` picks one item, `sample` picks several distinct ones,
`shuffle` reorders a list in place, and `choices` picks with replacement, optionally weighted. The
functions at module level (`random.choice`) share one hidden generator. For code you want to test,
create your own `random.Random(seed)`: the same seed produces the same sequence every time.

```python
import random

rng = random.Random(42)
customers = ["ada", "grace", "linus", "guido", "barbara"]
rng.choice(customers), rng.sample(customers, 2), rng.choices(["standard", "express"], weights=[9, 1], k=4)
```

Run it twice and you get the same picks. The habit worth building is to make functions that use
randomness **take the generator as a parameter**. Production code passes `random.Random()`, and tests
pass a seeded one:

```python
import random


def pick_reviewer(reviewers, rng):
    return rng.choice(reviewers)


team = ["ada", "grace", "linus"]
pick_reviewer(team, random.Random(7)) == pick_reviewer(team, random.Random(7))
```

> [!JS]
> Coming from JavaScript: `Math.random()` can't be seeded. `random.Random(seed)` can, which is what
> makes randomised Python code testable.

> [!WARNING]
> `random` is predictable by design, so never use it for passwords, tokens or reset links. Use
> `secrets.token_urlsafe()` for those.

## Where this leaves you

`partial` fixes some arguments in advance, `reduce` folds a list into one value when no built-in
does, and `cache` remembers the answers of a pure function whose arguments are hashable. `statistics`
summarises numbers, and `random` picks them, reproducibly when you pass in a seeded generator. The
drills include a route planner that needs a cache to finish at all.
