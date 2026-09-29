---
slug: import-system
title: The import system
summary: What import really does, from the sys.modules cache through finders and loaders, and why circular imports fail the way they do.
minutes: 40
exercises:
  - imports-sys-load-object
  - imports-sys-predict-cache
  - imports-sys-module-from-source
  - imports-sys-circular-fix
  - imports-sys-source-finder
---

Module 3 summed up `import pricing` as three steps: find a module, run it to build a module object,
bind a name to it, and cache the object in `sys.modules` so the file runs only once. That summary is
right, and each step is a piece of machinery you can inspect and replace. This lesson opens them
up, then uses what's inside to explain the most confusing import error there is.

The examples need real module files, so each one writes a few into a temporary folder and puts it
on `sys.path`. Python on this page has a small in-memory file system, so that works just as it
would on your machine. It also keeps running between examples, like a long-lived program, so each
example first removes its modules from the cache in case an earlier run imported them. By the end
of the lesson you'll know exactly why that line is needed.

## A module is an object

A module is an object of type `module`, and its attributes are exactly the global variables its
file defined. Its `__dict__` *is* the module's global namespace:

```python
import sys
import tempfile
from pathlib import Path

shop = Path(tempfile.mkdtemp())
sys.path.insert(0, str(shop))
sys.modules.pop("pricing", None)
(shop / "pricing.py").write_text('VAT = 0.2\n\ndef with_vat(price):\n    return round(price * (1 + VAT), 2)\n')

import pricing

type(pricing), pricing.__name__, [name for name in vars(pricing) if not name.startswith("__")], pricing.with_vat(10)
```

The `import` statement is a lookup plus an assignment: `import pricing` means roughly
`pricing = sys.modules["pricing"]`, after making sure the entry exists.

## `sys.modules` is the cache

Before searching for anything, `import` checks `sys.modules`. A hit returns the cached module
without running the file again, from anywhere in the program:

```python
import sys
import tempfile
from pathlib import Path

shop = Path(tempfile.mkdtemp())
sys.path.insert(0, str(shop))
sys.modules.pop("rates", None)
(shop / "rates.py").write_text('print("running rates.py")\nVAT = 0.2\n')

import rates
import rates                   # cached: nothing is printed
import rates as tax_rates

tax_rates is rates, sys.modules["rates"] is rates
```

So a module is a natural singleton: every part of the program that imports `rates` shares one
object, and a change made through one name is visible through all of them. The exception is
`from rates import VAT`, which copies the *current value* into the importing module's namespace.
Later changes to `rates.VAT` don't reach the copy:

```python
import sys
import tempfile
from pathlib import Path

shop = Path(tempfile.mkdtemp())
sys.path.insert(0, str(shop))
sys.modules.pop("settings", None)
(shop / "settings.py").write_text('CURRENCY = "GBP"\n')

import settings
from settings import CURRENCY

settings.CURRENCY = "EUR"
CURRENCY, settings.CURRENCY
```

That's the same reason module 7 patched a function where it was looked up, not where it was
defined. To run a module's file again, `importlib.reload(module)` re-executes it into the same
module object; deleting its `sys.modules` entry makes the next `import` build a brand-new one.

## Finders and loaders

On a cache miss, Python asks each **finder** in `sys.meta_path`, in order, whether it can find the
module. A finder that can returns a **module spec**: the module's name, where it lives (its
origin), and the **loader** that knows how to run it. The loader then creates the module object and
executes the code in it.

```python
import importlib.util
import sys

spec = importlib.util.find_spec("json")
finders = [getattr(finder, "__name__", type(finder).__name__) for finder in sys.meta_path]

spec.name, spec.origin, type(spec.loader).__name__, finders
```

The standard finders are `BuiltinImporter` (modules compiled into Python), `FrozenImporter`, and
`PathFinder`, which searches the folders on `sys.path`. Pyodide adds a couple of its own, and
serves the standard library from a zip file, which is why `json`'s origin looks unusual here.

You can do an import's steps by hand. This loads a file as a module without touching `sys.path`,
which is how plugin loaders and test runners bring in files from arbitrary folders:

```python
import importlib.util
import sys
import tempfile
from pathlib import Path

sys.modules.pop("discounts", None)
path = Path(tempfile.mkdtemp()) / "discounts.py"
path.write_text("def spring(price):\n    return round(price * 0.8, 2)\n")

spec = importlib.util.spec_from_file_location("discounts", path)
discounts = importlib.util.module_from_spec(spec)     # 1. an empty module object
sys.modules["discounts"] = discounts                  # 2. cached before it runs
spec.loader.exec_module(discounts)                    # 3. run the file in it

discounts.spring(25.0), type(spec.loader).__name__
```

Notice step 2 comes before step 3: the module is in the cache **before** its code runs. That
ordering is what the rest of this lesson turns on.

## Importing by name

When the module's name is a string, say from a config file, use `importlib.import_module`. It runs
the full machinery, cache included, and returns the module:

```python
import importlib

backend = "decimal"          # imagine this came from settings
module = importlib.import_module(backend)
module.Decimal("19.99") * 3
```

Plugin systems and entry points combine this with `getattr`: a string like
`"decimal:Decimal"` names a module and an object inside it, and the first drill builds the loader.

```quiz
question: "`from settings import CURRENCY` runs, and later some code sets `settings.CURRENCY = \"EUR\"`. What does the importing module's `CURRENCY` hold?"
options:
  - "\"EUR\", because modules are cached"
  - "The value it had when the from-import ran"
  - "It raises NameError"
answer: 1
explain: "The module object is shared, but from-import copied the value into another namespace at import time. Only code that reads settings.CURRENCY sees the change."
```

## Circular imports

Two modules that import each other are common: a customer has orders, an order has a customer.
Here's what happens when each uses `from ... import`:

```python raises
import sys
import tempfile
from pathlib import Path

shop = Path(tempfile.mkdtemp())
sys.path.insert(0, str(shop))
for name in ("customers", "orders"):
    sys.modules.pop(name, None)
(shop / "customers.py").write_text(
    "from orders import Order\n\n"
    "class Customer:\n"
    "    def place_order(self, total):\n"
    "        return Order(self, total)\n"
)
(shop / "orders.py").write_text(
    "from customers import Customer\n\n"
    "class Order:\n"
    "    def __init__(self, customer, total):\n"
    "        self.customer, self.total = customer, total\n"
)

import customers
```

Follow it step by step:

1. `import customers` puts an empty `customers` module in `sys.modules` and starts running it.
2. Its first line imports `orders`, which is new, so `orders` is cached and starts running.
3. `orders`'s first line wants `Customer` from `customers`. `customers` *is* in `sys.modules`, so
   there's no loop, but it's only run as far as its first line, and `Customer` doesn't exist yet.
   Hence "partially initialized module".

There are three ways out, in order of preference:

- **Restructure.** Put the shared piece in a third module both can import, or merge the two if
  they can't live apart.
- **Import the module, not the name.** `import customers` binds the half-built module, which is
  fine; `customers.Customer` is looked up later, when a function runs, by which time the module has
  finished.
- **Import inside the function** that needs it, so the import runs at call time. If the name is
  only needed for type hints, `if TYPE_CHECKING:` (module 9) avoids the runtime import entirely.

```python
import sys
import tempfile
from pathlib import Path

shop = Path(tempfile.mkdtemp())
sys.path.insert(0, str(shop))
for name in ("customers", "orders"):
    sys.modules.pop(name, None)
(shop / "customers.py").write_text(
    "import orders\n\n"
    "class Customer:\n"
    "    def __init__(self, name):\n"
    "        self.name = name\n\n"
    "    def place_order(self, total):\n"
    "        return orders.Order(self, total)\n"
)
(shop / "orders.py").write_text(
    "import customers\n\n"
    "class Order:\n"
    "    def __init__(self, customer, total):\n"
    "        if not isinstance(customer, customers.Customer):\n"
    "            raise TypeError('an order needs a Customer')\n"
    "        self.customer, self.total = customer, total\n"
)

import customers

order = customers.Customer("Ada").place_order(120)
order.customer.name, order.total
```

> [!JS]
> Coming from JavaScript: ES modules survive many cycles because `import { Customer }` is a live
> binding that fills in once the other module finishes. Python's `from customers import Customer`
> copies the value immediately, so a cycle fails at import time instead.

## Where this leaves you

A module is an object whose `__dict__` is its globals, and `import` binds a name to the entry in
`sys.modules`, creating it on a miss. Creating it means asking the finders on `sys.meta_path` for a
spec and letting its loader run the code, with the module cached before it runs. That caching
makes modules shared singletons, makes `from` imports copies, and turns import cycles into
"partially initialized module" errors, which importing the module instead of the name usually
fixes. The drills load objects by name, predict the cache, build modules by hand, untangle a cycle
and write a finder of your own.
