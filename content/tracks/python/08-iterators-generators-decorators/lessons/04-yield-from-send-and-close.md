---
slug: yield-from-send-and-close
title: yield from, send and close
summary: Delegate to another generator with yield from, collect its return value, and briefly, push values into a generator with send and shut it down with close.
minutes: 35
exercises:
  - gen-chain-sources
  - gen-predict-send-close
  - gen-fix-flatten
  - gen-average-latency
  - gen-upload-progress
---

Real pipelines are made of generators that call other generators: one that reads every log file
in a folder hands each file to one that reads a single file; one that walks a category tree hands
each branch to itself. `yield from` is how a generator says "yield everything that one yields",
and it does more than a loop would: it passes the inner generator's return value back out. This
lesson covers that, then the two generator methods you'll meet underneath other tools: `send` and
`close`.

## yield from an iterable

Say the log for each day lives in its own list or file, and a report wants them as one stream. You
could loop and re-yield:

```python
def all_lines(*days):
    for day in days:
        for line in day:
            yield line

monday = ["GET /", "POST /pay"]
tuesday = ["GET /cart"]
list(all_lines(monday, tuesday))
```

`yield from day` replaces the inner loop. It works with any iterable, and it reads as what it
means: "hand over everything in `day`, then carry on".

```python
def all_lines(*days):
    for day in days:
        yield from day

monday = ["GET /", "POST /pay"]
tuesday = ["GET /cart"]
list(all_lines(monday, tuesday))
```

It's still lazy. The outer generator pauses whenever the inner one does, so a caller that takes
two lines reads two lines, from however many files.

> [!JS]
> Coming from JavaScript: `yield from` is `yield*`. It delegates to any iterable, and evaluates to
> the inner generator's return value, just as `yield*` does.

## Recursive generators

Trees are where delegation earns its keep. A shop's categories nest to any depth, and a sitemap
needs every leaf. Here is the wrong way first, and it's a real bug, because it runs without any
error:

```python
catalogue = {
    "Coffee": {"Beans": ["Ethiopia 1 kg", "Decaf 250 g"], "Filters": ["V60 papers"]},
    "Mugs": ["Stoneware mug"],
}

def products(tree):
    for name, branch in tree.items():
        if isinstance(branch, dict):
            products(branch)          # builds a generator, then throws it away
        else:
            yield from branch

list(products(catalogue))
```

Only the mug survives. `products(branch)` doesn't run anything, as lesson 2 showed: it creates a
generator nobody asks for values. The recursive call has to be delegated to:

```python
catalogue = {
    "Coffee": {"Beans": ["Ethiopia 1 kg", "Decaf 250 g"], "Filters": ["V60 papers"]},
    "Mugs": ["Stoneware mug"],
}

def products(tree):
    for name, branch in tree.items():
        if isinstance(branch, dict):
            yield from products(branch)
        else:
            yield from branch

list(products(catalogue))
```

Each level of the tree is one generator frame, paused inside the `yield from` of the level above.
When a leaf is yielded, it passes straight up the chain of paused frames to whoever called `next()`.

## Getting a result back from yield from

A generator can `return` a value, which travels on its `StopIteration` (lesson 2). A loop throws
that value away, but `yield from` catches it: the whole `yield from` expression **evaluates to the
inner generator's return value**. That lets a helper stream its records and still report a
summary:

```python
def parse_file(lines):
    rejected = 0
    for line in lines:
        if line.count(",") != 1:
            rejected += 1
            continue
        yield line.split(",")
    return rejected

def parse_all(files, report):
    for name, lines in files.items():
        rejected = yield from parse_file(lines)
        report[name] = rejected

report = {}
rows = list(parse_all({"mon.csv": ["A1,12.5", "oops", "A2,8"], "tue.csv": ["bad,,row"]}, report))
rows, report
```

This is the behaviour a plain `for` loop can't give you, and the reason `yield from` exists: it
makes a generator a proper subroutine of another.

```quiz
question: "Inside a generator, `total = yield from batch()` runs. When does `total` get its value?"
options:
  - "Immediately, before batch() yields anything"
  - "After batch() has yielded everything and returned"
  - "Each time batch() yields a value"
answer: 1
explain: yield from first hands every value batch() yields out to the caller. Only when batch() finishes does its return value become the value of the expression.
```

## Sending values in

So far values have only flowed out of a generator. `yield` is also an **expression**: whatever the
caller passes to `gen.send(value)` becomes the value of the paused `yield`, and the generator runs
on to its next `yield`, whose value `send` returns. The two directions share one pause.

A generator used this way is often called a **coroutine**. Here is one that keeps a running
total of order amounts:

```python
def running_total():
    total = 0
    while True:
        amount = yield total
        total += amount

till = running_total()
next(till)                 # run to the first yield; it yields 0
till.send(12.5), till.send(8.0), till.send(30.0)
```

The first `next()` is called **priming**. A just-created generator hasn't reached a `yield` yet,
so there's nothing to receive a sent value, and sending one raises:

```python raises
def running_total():
    total = 0
    while True:
        amount = yield total
        total += amount

till = running_total()
till.send(12.5)
```

`next(gen)` is the same as `gen.send(None)`, so in a generator that's also used with `next()` the
`yield` expression can be `None`. And `yield from` forwards `send` to the inner generator, so
delegation works in both directions.

## close, and cleaning up

`gen.close()` stops a paused generator for good. Python raises `GeneratorExit` inside it, at the
`yield` where it's paused, so a `finally:` block (or a `with` block the generator is inside) gets
to clean up:

```python
def read_audit_log(entries):
    print("opening the audit log")
    try:
        for entry in entries:
            yield entry
    finally:
        print("closing the audit log")

log = read_audit_log(["login ada", "export report", "logout ada"])
next(log)
log.close()
```

You rarely need to call it yourself. `for` loops don't close a generator when you `break`, but
CPython closes one as soon as the last reference to it goes (reference counting, module 11), so a
generator abandoned halfway still runs its `finally`. Call `close()` when you want the cleanup to
happen at a known moment, such as releasing a database connection.

> [!WARNING]
> A generator must not `yield` again after `GeneratorExit` arrives. If it does, `close()` raises
> `RuntimeError: generator ignored GeneratorExit`. Clean up in `finally` and let it finish.

There's a third method, `gen.throw(exc)`, which raises an exception at the paused `yield` instead
of `GeneratorExit`. You'll almost never call it, but it's exactly how `@contextmanager` delivers an
exception from a `with` block to your generator, which is where lesson 7 picks it up.

## Where send fits today

`send`, `throw` and `yield from` were how Python did asynchronous code before `async` and
`await`: an event loop sent results into paused generators. Coroutines built with `async def` run
on the same machinery (module 12 covers them). In everyday code you'll use `yield from` often and
`send` rarely: a function or a small class is usually clearer than a coroutine you have to prime.

## Where this leaves you

`yield from` delegates to another iterable or generator, stays lazy, and evaluates to the inner
generator's return value, which makes recursive generators and generator subroutines work.
`send(value)` resumes a primed generator with a value for its `yield` expression. `close()` raises
`GeneratorExit` at the paused `yield`, so `finally` blocks run. The drills practise each one.
