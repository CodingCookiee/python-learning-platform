---
slug: first-tests
title: Why tests, and your first pytest suite
summary: What a test is for, what's worth testing, how pytest finds your tests, and why a plain assert is all you need.
minutes: 35
exercises:
  - pytest-order-total-tests
  - pytest-predict-discovery
  - pytest-username-boundaries
  - pytest-tests-that-never-run
---

You've changed the shipping rules in a pricing module. Did the discount code still work? Did
orders of exactly 50.00 still ship free? Without tests, the only way to know is to click through
the shop by hand, every time, for every change. A test suite answers those questions in a second,
so you can change code without being afraid of it.

## What a test is for

A test is code that runs your code with a known input and checks the result. You keep it, and you
run it again after every change. That gives you three things:

- **A safety net.** When a change breaks something that used to work (a **regression**), a test
  fails and names it, before a customer finds it.
- **A specification.** `test_orders_of_exactly_50_ship_free` says what the code must do more
  precisely than a comment, and it can't go out of date without failing.
- **Design feedback.** Code that is hard to test (it reads the clock, calls the network, prints
  instead of returning) is usually hard to reuse too. Tests push you towards small functions with
  clear inputs and outputs.

Not everything deserves a test. Test the **behaviour** callers depend on:

- the normal case, once,
- the **boundaries**, where most bugs live: the empty cart, exactly 50.00, a 15-character
  username when 15 is the limit,
- the **error cases**: what happens with a negative quantity or an unknown coupon,
- every **bug you fix**, so it can't come back.

Skip what can't break or isn't yours: a dataclass's generated `__init__`, Python's `sorted()`, the
private helper that your public function already exercises.

```quiz
question: A free-shipping rule says "orders of 50.00 or more ship free". Which single test is most likely to catch a bug?
options:
  - "An order of 120.00 ships free"
  - "An order of exactly 50.00 ships free"
  - "An order of 10.00 pays shipping"
answer: 1
explain: The boundary is where > and >= differ. 120.00 and 10.00 pass whichever one the code uses; 50.00 only passes if the rule is written correctly.
```

## A test is a function with an assert

A pytest test is an ordinary function whose name starts with `test_`, in a file whose name starts
with `test_`. Inside it you call your code and `assert` what should be true. If every assert holds,
the test passes; if one fails, or the code raises, it fails.

```python norun
# test_orders.py
from orders import order_total


def test_empty_order_costs_nothing():
    assert order_total([]) == 0


def test_quantity_multiplies_the_unit_price():
    assert order_total([("MUG", 2, 800)]) == 1600
```

That's the whole API for now: no base class, no `self`, no special assertion methods. Name each
test after the behaviour it checks, so a failure report reads like a sentence:
`test_quantity_multiplies_the_unit_price FAILED`.

> [!JS]
> Coming from Jest or Vitest: there's no `describe`/`it` and no `expect(x).toBe(y)`. A test is a
> plain function, and `assert x == y` does the job of every matcher.

## How pytest finds your tests

When you run `pytest`, it **collects** tests before running any:

1. It starts from the folder you give it (or the current folder) and walks it recursively.
2. It imports every file named `test_*.py` or `*_test.py`.
3. In each file it collects every function whose name starts with `test`, and every class whose
   name starts with `Test` (and has no `__init__`), taking the `test` methods from it.

Anything else is ignored, silently. A function called `check_refund` is never run, and neither is
a test class with an `__init__` (pytest can't create it, so it warns and skips it). That
silence is the dangerous part: a test that isn't collected can't fail, so a typo in a name looks
exactly like a passing test. `pytest --collect-only -q` lists what it found:

```text
$ pytest --collect-only -q
test_orders.py::test_empty_order_costs_nothing
test_orders.py::test_quantity_multiplies_the_unit_price
test_refunds.py::TestRefunds::test_full_refund

3 tests collected in 0.01s
```

Each line is a **node id**: the file, then `::`, then the class (if any) and the test name. You
can pass a node id to `pytest` to run just that test.

> [!WARNING]
> The rule is a prefix, `test`, not `test_`. A helper called `testimonial_count()` in a test file
> is collected and run as a test. Keep helpers' names clear of it.

```quiz
question: Which of these in test_refunds.py is run by pytest?
options:
  - "def refund_is_full(): ..."
  - "class RefundTests: def test_partial(self): ..."
  - "class TestRefunds: def test_partial(self): ..."
  - "class TestRefunds: def __init__(self): ...  def test_partial(self): ..."
answer: 2
explain: Classes must start with Test and have no __init__, and methods must start with test. The first isn't a test name at all, the second class name doesn't start with Test, and the last has an __init__, so pytest skips it with a warning.
```

## Why a plain assert is enough

In a normal Python file, a failed `assert total == 1950` says only `AssertionError`. Under pytest
it tells you what `total` was, and what it came from. That's **assertion rewriting**: when pytest
imports a test file, it rewrites every `assert` statement in it (at the level of the syntax tree,
before it's compiled) into code that saves each intermediate value, so it can print them all if
the check fails.

Run this. It writes a small test file and runs real pytest on it, here in your browser. The code
under test has a planted bug: it ignores quantities.

```python
import os
import tempfile

import pytest

TESTS = '''
def order_total(lines):
    return sum(unit_price for sku, quantity, unit_price in lines)   # bug: ignores quantity


def test_single_mug():
    assert order_total([("MUG", 1, 800)]) == 800


def test_quantity_multiplies_the_unit_price():
    assert order_total([("MUG", 2, 800), ("TEA", 1, 350)]) == 1950
'''

os.chdir(tempfile.mkdtemp())
with open("test_orders.py", "w") as file:
    file.write(TESTS)

# --capture=sys and the two -p flags are only needed in the browser
pytest.main(["-q", "--capture=sys", "-p", "no:cacheprovider", "-p", "no:faulthandler"])
```

The report shows `assert 1150 == 1950`, and under it
`where 1150 = order_total([('MUG', 2, 800), ('TEA', 1, 350)])`: the actual value, and the call that
produced it. The first test passed even with the bug, because a quantity of 1 hides it. One test
with a quantity above 1 is what catches it.

Rewriting only applies to test files (and `conftest.py`, lesson 2). That's why pytest code uses a
bare `assert` everywhere instead of `assertEqual`-style methods: the plain statement already gives
the best message.

> [!NOTE]
> The last value shown is `ExitCode.TESTS_FAILED`. `pytest` exits with 0 when everything passed,
> 1 when a test failed and 5 when it collected no tests at all, which is how CI knows to go red.

## Running pytest day to day

On your own machine you install pytest into the project (`uv add --dev pytest`) and run it from
the project folder. The options worth knowing from day one:

```bash
uv run pytest                               # everything
uv run pytest -q                            # quieter: one dot per passing test
uv run pytest test_orders.py                # one file
uv run pytest test_orders.py::test_single_mug   # one test, by node id
uv run pytest -k refund                     # tests whose names contain "refund"
uv run pytest -x                            # stop at the first failure
uv run pytest --lf                          # rerun only the tests that failed last time
```

A good habit is to see each new test **fail once**. Break the code on purpose (or write the test
before the code, lesson 7) and check the test goes red. A test you have never seen fail might not
be testing anything.

```quiz
question: You've written test_vat_is_twenty_percent, but pytest reports "5 passed" as it did before you added it. What's the most likely cause?
options:
  - "The test passed, so the VAT code is correct"
  - "pytest didn't collect it, because of its file or class, or a second function with the same name"
  - "Assertion rewriting is switched off"
answer: 1
explain: The count didn't go up, so the test never ran. Check the file name starts with test_, the class (if any) starts with Test and has no __init__, and no later function in the file reuses the same name.
```

## Where this leaves you

A test is a function named `test_…` in a file named `test_…`, using plain `assert`. pytest collects
by name, silently skipping anything that doesn't match, and rewrites your asserts so failures show
the values involved. Test the behaviour, the boundaries and the error cases. In the drills below
you write tests for real code, and they're graded the way good tests should be: they must pass on
the correct code and fail on versions with bugs planted in them.
