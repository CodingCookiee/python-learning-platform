---
slug: parametrize
title: Many cases with parametrize
summary: Run one test over a table of inputs, give each case a readable id, and pick the cases that catch bugs.
minutes: 35
exercises:
  - pytest-shipping-bands-table
  - pytest-predict-parametrize
  - pytest-refactor-to-parametrize
  - pytest-tax-bands
---

Shipping costs depend on the parcel's weight: small up to 2 kg, medium up to 10 kg, large up to
30 kg. Testing that properly means six or eight cases, and written as separate functions they're
six copies of the same two lines with different numbers. When one fails you want to know which
weight it was, and when a rule changes you want to edit one table, not six functions.

## One test, many cases

`@pytest.mark.parametrize` takes the names of the arguments and a list of cases, and runs the test
once for each case:

```python norun
import pytest

from shipping import shipping_band


@pytest.mark.parametrize(
    "weight_kg, band",
    [
        (0.5, "small"),
        (2, "small"),
        (2.01, "medium"),
        (10, "medium"),
        (30, "large"),
    ],
)
def test_shipping_band(weight_kg, band):
    assert shipping_band(weight_kg) == band
```

The first argument is a string of parameter names, separated by commas. Each case is a tuple with
one value per name, and pytest passes them as those parameters, the same way it passes fixtures.

This happens at **collection** time. pytest turns the one function into five separate test items,
each with its own **id** in square brackets, and each passes or fails on its own. A failure in the
`2.01` case doesn't hide the others:

```text
$ pytest -v test_shipping.py
test_shipping.py::test_shipping_band[0.5-small] PASSED
test_shipping.py::test_shipping_band[2-small] PASSED
test_shipping.py::test_shipping_band[2.01-medium] FAILED
test_shipping.py::test_shipping_band[10-medium] PASSED
test_shipping.py::test_shipping_band[30-large] PASSED
```

> [!JS]
> Coming from Jest: this is `test.each([[0.5, "small"], ...])("band for %d kg", ...)`, with the
> table attached to the test function as a decorator.

## Readable ids

pytest builds each id from the values: numbers, strings and booleans appear as themselves, joined
with `-`. Anything else (a dict, a dataclass, a `Decimal`) gets the parameter name and the case
number instead, like `order0` and `order1`, which tells you nothing. Name the cases yourself with
`ids=`, one string per case:

```python norun
@pytest.mark.parametrize(
    "weight_kg, band",
    [(2, "small"), (2.01, "medium"), (10, "medium")],
    ids=["exactly-2kg", "just-over-2kg", "exactly-10kg"],
)
def test_shipping_band(weight_kg, band):
    assert shipping_band(weight_kg) == band
```

Or name one case at a time with `pytest.param`, which keeps each id next to its values:

```python norun
@pytest.mark.parametrize(
    "weight_kg, band",
    [
        pytest.param(2, "small", id="exactly-2kg"),
        pytest.param(2.01, "medium", id="just-over-2kg"),
    ],
)
```

Run this. The code under test has a bug at one boundary, and the ids make it obvious which one:

```python
import os
import tempfile

import pytest

TESTS = '''
import pytest

def shipping_band(weight_kg):
    if weight_kg < 2:            # bug: should be <=
        return "small"
    if weight_kg <= 10:
        return "medium"
    return "large"

@pytest.mark.parametrize(
    "weight_kg, band",
    [(0.5, "small"), (2, "small"), (2.01, "medium"), (10, "medium"), (10.5, "large")],
    ids=["half-kg", "exactly-2kg", "just-over-2kg", "exactly-10kg", "just-over-10kg"],
)
def test_shipping_band(weight_kg, band):
    assert shipping_band(weight_kg) == band
'''

os.chdir(tempfile.mkdtemp())
with open("test_shipping.py", "w") as file:
    file.write(TESTS)

pytest.main(["-v", "--capture=sys", "-p", "no:cacheprovider", "-p", "no:faulthandler"])
```

Ids also work with `-k`: `pytest -k exactly` runs only the cases whose ids contain "exactly".

```quiz
question: "A test is parametrized with `\"code, percent\"` and the cases `[(\"SAVE10\", 10), (\"SAVE20\", 20)]`, with no ids. What is the id of the second case?"
options:
  - "test_discount[1]"
  - "test_discount[SAVE20-20]"
  - "test_discount[code1-percent1]"
answer: 1
explain: Strings and numbers become part of the id as they are, joined with a dash. Only values pytest can't show simply, such as dicts or objects, fall back to the parameter name and case number.
```

## Choosing the cases

A table makes adding cases cheap, which is a trap: forty cases in the middle of each band test
the same thing forty times. The cases that find bugs are at the edges, exactly as in lesson 1:

- **each side of every boundary**: 2 and 2.01, 10 and 10.01,
- **the extremes**: the smallest allowed value, the largest,
- **one ordinary value** per band, so you know the band works at all.

Keep error cases in their own test (lesson 4 shows how to test that a function raises). A table
where some rows expect a value and others expect an exception needs an `if` in the test body,
and then the test has logic of its own that can be wrong.

```quiz
question: A loyalty rule gives 10% off from 3 years of membership and 15% off from 6. Which cases are the best test table?
options:
  - "1, 4, 8"
  - "2, 3, 5, 6"
  - "0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10"
answer: 1
explain: 2 and 3 pin down the first boundary, 5 and 6 the second. 1, 4 and 8 would pass even if the boundaries were off by one, and eleven cases add nothing that four don't.
```

## Stacking decorators

Stack two `parametrize` decorators and pytest runs **every combination**:

```python norun
@pytest.mark.parametrize("currency", ["GBP", "EUR", "USD"])
@pytest.mark.parametrize("express", [False, True])
def test_quote_has_a_positive_price(currency, express):
    assert quote(weight_kg=1, currency=currency, express=express).price > 0
```

That's 3 × 2 = 6 tests, with ids like `test_quote_has_a_positive_price[False-GBP]`. Use it when every
combination really should behave the same way. When the expected result depends on the combination,
write the table out: an expected value computed inside the test is the code under test
written a second time, and it can have the same bug.

## Where this leaves you

`parametrize` turns one test function into one test per case, each with its own id and result.
Give cases meaningful ids with `ids=` or `pytest.param(..., id=...)`, choose them at the boundaries,
and keep the test body free of logic. The drills include turning a file of copy-pasted tests into
one table.
