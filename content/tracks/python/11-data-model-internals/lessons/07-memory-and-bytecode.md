---
slug: memory-and-bytecode
title: Memory and bytecode
summary: How CPython frees objects with reference counting and a cycle collector, how to measure and weakly hold them, and what dis shows about the code that runs.
minutes: 45
exercises:
  - memory-predict-finalisers
  - memory-deep-size
  - memory-weak-cache
  - memory-cycle-leak-fix
  - bytecode-predict-local-or-global
  - bytecode-global-names
---

You never free memory in Python, but when and how objects go away still matters: a file handle
that stays open, a cache that quietly keeps every record it ever saw, a memory estimate that's off
by a factor of a hundred. This last lesson looks at how CPython manages objects, how to measure
them honestly, and, one level further down, the bytecode your functions actually run as.

## Every object counts its references

Each CPython object carries a **reference count**: how many names, containers and other objects
currently point at it. `sys.getrefcount` shows it:

```python
import sys

basket = ["MUG-01", "TEA-50"]
start = sys.getrefcount(basket)

alias = basket
orders = {"ada": basket}
with_two_more = sys.getrefcount(basket)

del alias                 # removes a name, not the object
orders.clear()

start, with_two_more, sys.getrefcount(basket)
```

Watch the changes, not the absolute numbers. The count can include temporary references made by
the call itself, and CPython 3.14 skips some of those inside functions, so the same line can
report a different number in a function or on another version. Some objects, like `None`, `True`
and small integers, are **immortal** since 3.12: their count is a huge fixed number and they're
never freed.

## Freed the moment the count hits zero

When the count drops to zero, CPython frees the object immediately, and calls its `__del__` method
first if it has one. That makes cleanup predictable: here the temporary export is gone before the
function has even returned to its caller.

```python
class ExportFile:
    def __init__(self, name):
        self.name = name
        print("open", name)

    def __del__(self):
        print("closed", self.name)

def export_report():
    handle = ExportFile("report.csv")
    print("writing rows")

export_report()
print("back in the caller")
```

Don't build on that, though. Other Pythons, such as PyPy, don't use reference counting; an
exception's traceback keeps every local variable of the failed function alive; and cycles (next
section) delay it. For anything that must be closed, use `with` (module 6).

> [!JS]
> Coming from JavaScript: V8 uses a tracing garbage collector, so an unreachable object is freed
> at some unspecified later time and a `FinalizationRegistry` callback may never run. CPython frees
> most objects the instant the last reference goes, and has a tracing collector only for cycles.

## Cycles need the garbage collector

An order that points at its line, and a line that points back at its order, keep each other's
counts above zero forever, even when nothing else can reach them. The `gc` module's **cycle
collector** runs from time to time, finds groups of objects that are only reachable from each
other, and frees them:

```python
import gc

class Node:
    def __init__(self, name):
        self.name = name

    def __del__(self):
        print("freed", self.name)

gc.disable()                      # so it can't run at a random moment in this demo
order, line = Node("order"), Node("line")
order.line, line.order = line, order
del order, line
print("both names deleted, nothing freed yet")

gc.collect()
print("after gc.collect()")
gc.enable()
```

The collector runs automatically when enough new objects have been allocated
(`gc.get_threshold()` shows the settings), so cycles are freed eventually, but later and in bulk.
Long-running services and batch jobs that disable it for speed turn every cycle into a leak. The
cure is not to create the cycle in the first place, which is what weak references are for.

## `sys.getsizeof` is shallow

`sys.getsizeof(obj)` is the size of that one object in bytes, not of anything it points to. A list
stores references, so its size doesn't depend on how big its items are:

```python
import sys

def sizes(items):
    return sys.getsizeof(items), sum(sys.getsizeof(item) for item in items)

sizes(["a", "b"]), sizes(["a" * 10_000, "b" * 10_000])
```

Each pair is the list's own size, then the total size of its items. The lists are the same size;
the items are not.

The real footprint is the list plus everything reachable from it, counted once each; one of the
drills writes that function. The numbers here come from a 32-bit WebAssembly build, so they're
smaller than on a 64-bit laptop, but the proportions are the same.

For a whole program, `tracemalloc` measures what was actually allocated. It's the honest way to
check lesson 4's claim about `__slots__`:

```python
import tracemalloc

class Tick:
    def __init__(self, symbol, price, volume):
        self.symbol, self.price, self.volume = symbol, price, volume

class SlotTick:
    __slots__ = ("symbol", "price", "volume")

    def __init__(self, symbol, price, volume):
        self.symbol, self.price, self.volume = symbol, price, volume

def allocated(cls):
    tracemalloc.start()
    ticks = [cls("ACME", 101.25, 300) for _ in range(10_000)]
    size, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return size

plain, slotted = allocated(Tick), allocated(SlotTick)
plain, slotted, f"{1 - slotted / plain:.0%} less"
```

## Weak references

A **weak reference** points at an object without adding to its count. Calling it returns the
object while it's alive, and `None` once it has been freed. The `weakref` module also has
containers built on them: a `WeakValueDictionary` drops an entry as soon as nothing else holds its
value, which makes it the right shape for a cache of shared objects.

```python
import weakref

class Customer:
    def __init__(self, name):
        self.name = name

ada = Customer("Ada")
ref = weakref.ref(ada)
loaded = weakref.WeakValueDictionary({"C-1": ada})
print(ref().name, len(loaded))

del ada                            # the last strong reference
ref(), len(loaded)
```

A weak reference also breaks a cycle: if each line holds only a weak reference to its order, the
order is freed as soon as the last real reference to it goes, collector or not. Not everything can
be weakly referenced. Built-in values like `int`, `str`, `list` and `tuple` can't, and neither can
a slotted class unless `"__weakref__"` is one of its slots.

```quiz
question: "A cache holds records in a `WeakValueDictionary`. A caller loads record C-7, uses it, and drops its last reference. What does the cache do?"
options:
  - "Keeps C-7 until the cache is cleared"
  - "Drops C-7 as soon as the record is freed"
  - "Keeps C-7 until the next gc.collect()"
answer: 1
explain: "The cache's reference is weak, so it doesn't keep the record alive. With no cycle involved, reference counting frees the record immediately, and the entry disappears with it."
```

## Bytecode with `dis`

CPython doesn't run your source text. It compiles each function once to **bytecode**, a list of
simple instructions stored in `func.__code__`, and a loop in the interpreter executes them. The
`dis` module prints them:

```python
import dis

VAT = 0.2

def gross(net):
    return round(net * (1 + VAT), 2)

dis.dis(gross)
```

On Python 3.14 that prints:

```text
  5           RESUME                   0

  6           LOAD_GLOBAL              1 (round + NULL)
              LOAD_FAST_BORROW         0 (net)
              LOAD_SMALL_INT           1
              LOAD_GLOBAL              2 (VAT)
              BINARY_OP                0 (+)
              BINARY_OP                5 (*)
              LOAD_SMALL_INT           2
              CALL                     2
              RETURN_VALUE
```

The instruction names change from version to version (3.14 added `LOAD_FAST_BORROW` and
`LOAD_SMALL_INT`), but the shape doesn't, and it tells you things the source doesn't:

- **Locals and globals are decided at compile time.** `net` is `LOAD_FAST`: a slot in the frame,
  read by position. `round` and `VAT` are `LOAD_GLOBAL`: dict lookups in the module's globals,
  then in the builtins. That's why a local variable is faster than a global one, and why an
  assignment *anywhere* in a function makes a name local everywhere in it.
- **Constant expressions are folded.** `60 * 60 * 24` written inside a function is compiled to the
  single constant `86400`.
- **One line can be many steps.** `sales += 1` on a global is a load, an add and a store. Another
  thread can run in between, which is why module 12 needs locks.

```python
import dis

sales = 0

def record_sale():
    global sales
    sales += 1

def seconds_in(days):
    return days * 60 * 60 * 24      # folded left to right: (days * 60) * 60 * 24

def per_day(total):
    return total / (60 * 60 * 24)   # a constant sub-expression: folded to 86400

dis.dis(record_sale)
86400 in seconds_in.__code__.co_consts, 86400 in per_day.__code__.co_consts
```

`seconds_in` isn't folded because it starts with a variable, and multiplication is evaluated left
to right. The same compile-time decision about locals is behind a famous error:

```python raises
discount = 5

def sale_price(price):
    if price > 100:
        discount = 10          # an assignment, so discount is local in the whole function
    return price - discount

sale_price(50)
```

`func.__code__.co_varnames` lists a function's local names and `co_names` the global ones it
uses, which is often all you need; `dis.get_instructions(func)` gives the instructions as objects
you can filter, and the last drill uses it to list every global a function touches.

## Where this leaves you

CPython frees an object as soon as its reference count reaches zero, and the `gc` collector cleans
up cycles later. `sys.getsizeof` is one object's size; a real footprint means walking what it
references, or measuring with `tracemalloc`. Weak references let caches and back-pointers refer
to objects without keeping them alive. And `dis` shows the bytecode behind it all: fast locals,
dict-lookup globals, folded constants, and lines that take several steps. That completes the
module; the capstone puts descriptors, `__init_subclass__` and the data model together in a tiny
ORM.
