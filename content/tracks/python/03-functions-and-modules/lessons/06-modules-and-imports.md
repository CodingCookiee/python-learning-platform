---
slug: modules-and-imports
title: Modules, packages and imports
summary: What import actually does, the three ways to write it, how to split code into files, and the __name__ == "__main__" guard.
minutes: 35
exercises:
  - imports-boxes-needed
  - imports-predict-name
  - imports-group-by-extension
  - imports-main-guard-fix
  - imports-unit-converter-cli
---

Once a program grows past a couple of hundred lines, one file gets hard to work in. Python's unit of
organisation is the **module**, and the rule is short: **every `.py` file is a module**, and any
module can use the functions of another by importing it. The standard library is just a large set
of modules that come with Python, so you learn imports by using it.

## What import does

`import math` does three things the first time it runs:

1. Finds a module called `math`.
2. Runs it, top to bottom, creating a **module object** that holds every name the module defined.
3. Binds the name `math` to that object in your file.

You then reach the module's contents with a dot, like any other object's attributes:

```python
import math

math.ceil(7 / 3), math.sqrt(2), math.pi, type(math)
```

Python caches the module object in `sys.modules`. Importing it again, from anywhere in the program,
reuses the cached object instead of running the file a second time, so every part of a program
shares one copy of each module:

```python
import sys
import colorsys

import colorsys as colours          # a second import finds it in the cache

colours is colorsys, sys.modules["colorsys"] is colorsys
```

## Three ways to write an import

| You write | You get | Use it when |
|-----------|---------|-------------|
| `import math` | the module, as `math` | you want calls to say where they come from: `math.ceil(x)` |
| `from pathlib import Path` | one name from the module | you use that name a lot and it's clear on its own |
| `import random as rnd` | the module, under a name you choose | the name is long or clashes with one of yours |

```python
import math
from pathlib import Path
import random as rnd

report = Path("reports/2026/q3-sales.csv")
rng = rnd.Random(42)                 # seeded, so the "random" pick is repeatable

math.ceil(47 / 12), report.suffix, report.stem, rng.choice(["ada", "grace", "linus"])
```

`from x import y` copies the name `y` into your file, but the module still runs in full, and it
still ends up in `sys.modules`. You can combine the forms: `from datetime import date as Date`.

> [!WARNING]
> Avoid `from math import *`. It dumps every public name of the module into your file, so readers
> can't tell where a name came from, and a later import can silently replace one of your names.

## Your own modules

Any `.py` file next to your script can be imported by its file name, without the `.py`. Say a
project has two files:

```text
shop/
  pricing.py
  checkout.py
```

```python norun
# pricing.py
VAT_RATE = 0.2

def with_vat(net):
    """Return net plus VAT, rounded to cents."""
    return round(net * (1 + VAT_RATE), 2)
```

```python norun
# checkout.py
from pricing import with_vat
import pricing

print(with_vat(50))          # 60.0
print(pricing.VAT_RATE)      # 0.2
```

Running `python checkout.py` (or `uv run checkout.py`) makes Python look for `pricing` in the
script's own folder first, then in the standard library and installed packages. There's no export
list: every top-level name in `pricing.py` can be imported. A leading underscore, as in
`_round_cents`, is the convention for "internal, please don't import this".

> [!WARNING]
> Because the script's folder is searched first, a file of yours called `random.py`, `math.py` or
> `json.py` **hides** the standard-library module of the same name. The symptom is a strange
> `AttributeError`, such as `module 'random' has no attribute 'choice'`. Don't name files after
> modules you use.

> [!JS]
> Coming from JavaScript: there's no `export` keyword and no file extension in the import. Python
> finds modules by name on a search path (`sys.path`), not by relative file path.

## Packages

A **package** is a folder of modules. It usually contains an `__init__.py` file, which runs when
the package is first imported and is often empty. Dots in an import follow the folders:

```text
expenses/
  __init__.py
  ledger.py
  settle.py
  cli.py
```

```python norun
from expenses.ledger import add_expense      # a function from expenses/ledger.py
from expenses import settle                  # the module expenses/settle.py
import expenses.cli as cli

# Inside the package, settle.py can import its neighbour relatively:
from .ledger import balances
```

You'll build real packages with `pyproject.toml` in module 10. For now, the mental model is enough:
a module is a file, a package is a folder, and dots in an import path are folder separators.

```quiz
question: "A project has `inventory/stock.py` defining `reorder()`. Which import lets you call it as `reorder()`?"
options:
  - "import inventory.stock"
  - "from inventory.stock import reorder"
  - "from inventory import reorder"
answer: 1
explain: "import inventory.stock would make you write inventory.stock.reorder(). from inventory import reorder only works if inventory/__init__.py itself defines or imports reorder."
```

## __name__ and the main guard

Every module has a name, stored in `__name__`. An imported module's `__name__` is its import name,
like `"math"` or `"expenses.ledger"`. But the file you actually **run** gets the special name
`"__main__"`. The examples on this page run as scripts, so:

```python
import math
import random as rnd

__name__, math.__name__, rnd.__name__
```

An alias doesn't rename the module: `rnd.__name__` is still `"random"`.

This lets one file be both a library and a program. Put the program part in a `main()` function,
and only call it when the file is being run:

```python
def to_pence(amount):
    """Return a money amount in pounds as a whole number of pence."""
    return round(amount * 100)

def main():
    for amount in [4.99, 12.5]:
        print(f"£{amount:.2f} is {to_pence(amount)}p")

if __name__ == "__main__":
    main()
```

Run as a script, `__name__` is `"__main__"`, so `main()` runs. Imported by another file, or by a
test suite, `__name__` is the module's name, so nothing runs and the importer just gets
`to_pence`. Without the guard, **importing** the file would print, ask for input, or write files,
which is never what the importer wanted.

> [!NOTE]
> The drills on this site work the same way. The tests **import** your file to call your functions,
> so a program at the top level of your file runs during that import. Tests that check the program
> itself run the file as `__main__`, exactly as `python yourfile.py` would.

## Where this leaves you

A module is a `.py` file that runs once, on first import, and is cached after that. `import x`,
`from x import y` and `import x as z` bind different names to the same module. A package is a
folder of modules, and `if __name__ == "__main__":` keeps a file importable while still letting it
run as a program. That's the shape of this module's capstone: an expense-splitting library with a
command-line entry point.
