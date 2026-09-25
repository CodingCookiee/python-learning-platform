---
slug: stdlib-collections
title: The collections module
summary: Counter, defaultdict, deque, namedtuple and ChainMap replace the loops you'd otherwise write around a plain dict or list.
minutes: 40
exercises:
  - collections-top-words
  - collections-predict-defaultdict
  - collections-refactor-tally
  - collections-parse-order
  - collections-moving-average
  - collections-layered-settings
---

Dicts, lists and tuples cover most of what a program stores. But the same few jobs keep coming up
around them: counting things, grouping things, keeping the last few of something, naming the fields
of a record, and looking a key up in several places in turn. The `collections` module has a tool for
each, and each one replaces a loop you've probably written by hand.

## Counting with Counter

Here is the loop that every developer writes sooner or later, counting status codes in a log:

```python
statuses = [200, 200, 404, 200, 500, 404, 200, 301]

counts = {}
for code in statuses:
    if code in counts:
        counts[code] += 1
    else:
        counts[code] = 1
counts
```

`Counter` is a dict that does this for you. Give it anything iterable, and it counts the items:

```python
from collections import Counter

statuses = [200, 200, 404, 200, 500, 404, 200, 301]
counts = Counter(statuses)
counts.most_common(2), counts[404], counts[418]
```

`most_common(n)` gives the top `n` as `(item, count)` pairs, biggest first; ties keep the order in
which the items were first seen. A missing key counts as `0` instead of raising `KeyError`, and
reading it doesn't add it.

Counters also do arithmetic, which makes them good for combining tallies. `+` adds counts, `-`
subtracts and drops anything that falls to zero or below, and `total()` adds up every count:

```python
from collections import Counter

monday = Counter(mug=12, tea=30, cake=4)
tuesday = Counter(mug=3, tea=41)

week = monday + tuesday
week, week.total(), monday - tuesday
```

> [!TIP]
> Counting words is a one-liner: `Counter(text.lower().split())`. Anything you can loop over works,
> including a string, which counts its characters.

## Grouping with defaultdict

The other everyday loop builds a dict of lists: orders grouped by customer, log lines grouped by
host. By hand, every new key needs a check first. `defaultdict` takes a **factory**, a function it
calls to create the value for a key it hasn't seen:

```python
from collections import defaultdict

orders = [("ada", "A1"), ("grace", "A2"), ("ada", "A3"), ("linus", "A4")]

by_customer = defaultdict(list)
for customer, order_id in orders:
    by_customer[customer].append(order_id)
dict(by_customer)
```

The factory is any callable that takes no arguments: `list` gives `[]`, `int` gives `0`, `set` gives
an empty set. `defaultdict(int)` is a simple counter, and `defaultdict(set)` collects unique values,
like the distinct pages each visitor opened.

> [!JS]
> Coming from JavaScript: this replaces `(groups[key] ??= []).push(order)`. The default lives in the
> dict itself, so every place that reads it gets the same behaviour.

There is one trap. *Reading* a missing key also calls the factory, and stores the result:

```python
from collections import defaultdict

visits = defaultdict(int)
visits["/home"] += 1

if visits["/admin"] > 0:
    print("someone opened /admin")

dict(visits)
```

Nobody opened `/admin`, yet it's now a key with a count of `0`. To check without creating anything,
use `"/admin" in visits` or `visits.get("/admin", 0)`. When you're done building, `dict(result)`
turns it back into an ordinary dict, so code further along can't create keys by accident.

## Queues and recent items with deque

A `deque` (say "deck") is a list that's fast at both ends. `list.pop(0)` has to shift every other item
one place to the left, so it gets slower as the list grows. `deque.popleft()` takes the same time
however long the deque is, which makes it the right type for a queue:

```python
from collections import deque

support_queue = deque(["ticket-101", "ticket-102"])
support_queue.append("ticket-103")     # join at the back
first = support_queue.popleft()        # serve from the front
first, support_queue
```

Give a deque a `maxlen` and it becomes a sliding window: when it's full, adding an item at one end
drops one from the other. That's exactly "the last N things", with no index arithmetic:

```python
from collections import deque

recent = deque(maxlen=3)
for page in ["/home", "/shop", "/cart", "/checkout", "/thanks"]:
    recent.append(page)
recent
```

## Records with namedtuple

Tuples are a compact way to pass a record around, but `order[2]` says nothing about what the third
field is. `namedtuple` builds a tuple type whose fields have names:

```python
from collections import namedtuple

Order = namedtuple("Order", ["id", "customer", "total"])

order = Order("A1042", "ada", 19.99)
order.customer, order[2], order
```

It's still a tuple: it unpacks, compares and sorts like one, and it's immutable. To "change" a field
you make a new record with `_replace`, and `_asdict()` turns it into a dict (for JSON, say). The
leading underscore is there only to keep these names from clashing with your field names; they are
public, documented methods.

```python
from collections import namedtuple

Order = namedtuple("Order", ["id", "customer", "total"])
order = Order("A1042", "ada", 19.99)

discounted = order._replace(total=17.99)
order_id, customer, total = discounted
discounted._asdict(), order.total
```

Being immutable means attribute assignment fails:

```python raises
from collections import namedtuple

Order = namedtuple("Order", ["id", "customer", "total"])
order = Order("A1042", "ada", 19.99)
order.total = 0
```

> [!NOTE]
> Module 5 introduces `dataclasses`, which do the same job with type hints, defaults and optional
> mutability. A namedtuple is still the lighter choice for small read-only records.

## Layered lookups with ChainMap

Settings usually come from several places, in order of priority: command-line flags beat environment
variables, which beat the defaults. `ChainMap` looks a key up in each dict in turn and returns the
first hit, without copying anything:

```python
from collections import ChainMap

defaults = {"port": 8000, "debug": False, "workers": 2}
env = {"port": 8080}
cli = {"debug": True}

settings = ChainMap(cli, env, defaults)
settings["port"], settings["debug"], settings["workers"]
```

Two things make it different from merging with `defaults | env | cli`. It's a **live view**, so a
later change to any of the dicts shows up in it straight away. And writes go only to the **first**
dict, so the defaults stay untouched:

```python
from collections import ChainMap

defaults = {"port": 8000, "debug": False, "workers": 2}
env = {"port": 8080}
cli = {"debug": True}
settings = ChainMap(cli, env, defaults)

env["workers"] = 4          # a live change underneath
settings["port"] = 9000     # a write goes into cli
settings["workers"], cli, defaults
```

```quiz
question: "With settings = ChainMap(cli, env, defaults), what does del settings['port'] do when 'port' is only in defaults?"
options:
  - Removes port from defaults
  - Raises KeyError
  - Removes port from every map that has it
answer: 1
explain: Writes and deletes only ever touch the first map. port isn't in cli, so there is nothing there to delete, and ChainMap raises KeyError rather than reaching into defaults.
```

## Where this leaves you

`Counter` counts, `defaultdict` groups, `deque` queues and keeps the last N, `namedtuple` names the
fields of a small record, and `ChainMap` layers dicts by priority. When you catch yourself writing
`if key not in d: d[key] = ...`, one of these is usually the shorter, clearer answer. The drills
start with a one-line `Counter` and finish with layered settings.
