---
slug: raises-and-approx
title: Exceptions and floats
summary: Check that code raises the right error with pytest.raises, and compare floats without being fooled with pytest.approx.
minutes: 35
exercises:
  - pytest-refund-raises
  - pytest-predict-approx
  - pytest-fix-raises-tests
  - pytest-loan-payment-approx
  - pytest-payment-errors
---

Refusing bad input is behaviour too, and often the most important kind: a refund larger than the
order, a card that expired last month, a negative quantity. A suite that only tests the happy path
never notices when a validation check is deleted. And some results can't be compared with `==` at
all, because floating-point arithmetic is approximate. pytest has a tool for each problem.

## Checking that code raises

The wrong way first. This test looks as though it checks that an over-refund is refused:

```python norun
def test_refund_larger_than_order_is_refused():
    try:
        refund(paid_pence=2000, amount_pence=5000)
    except ValueError:
        pass
```

It passes when `refund` raises `ValueError`. It also passes when `refund` raises nothing and
happily pays out 50.00, because a test with no failed assert passes. The check that matters, "this
must raise", isn't written anywhere.

`pytest.raises` is a context manager that writes it for you:

```python norun
import pytest


def test_refund_larger_than_order_is_refused():
    with pytest.raises(ValueError):
        refund(paid_pence=2000, amount_pence=5000)
```

When the block ends, there are three possibilities:

- It raised `ValueError` (or a subclass): pytest catches it, and the test carries on.
- It raised nothing: the test fails with `DID NOT RAISE <class 'ValueError'>`.
- It raised something else, say `KeyError`: that exception isn't caught, so the test fails with it.

`pytest.raises` works outside tests too, which makes it easy to try:

```python
import pytest


def refund(paid_pence, amount_pence):
    if amount_pence > paid_pence:
        raise ValueError(f"can't refund {amount_pence}p of a {paid_pence}p order")
    return paid_pence - amount_pence


with pytest.raises(ValueError):
    refund(2000, 5000)

"refused, as expected"
```

And here's the failure you get when nothing is raised:

```python raises
import pytest


def refund(paid_pence, amount_pence):
    return paid_pence - amount_pence      # the validation was deleted


with pytest.raises(ValueError):
    refund(2000, 5000)
```

> [!JS]
> Coming from Jest: `expect(() => refund(2000, 5000)).toThrow(RangeError)`. In pytest the call
> goes inside a `with` block instead of an arrow function.

## Checking the message and the exception

A function often raises the same exception type for different reasons, so check which reason it
was. `match=` is a **regular expression** that pytest searches for in `str(exception)`, the same as
`re.search`:

```python norun
def test_refund_of_zero_is_refused():
    with pytest.raises(ValueError, match="must be positive"):
        refund(paid_pence=2000, amount_pence=0)
```

Because it's a regex, characters like `(`, `.`, `?` and `+` have special meanings. To match a
message containing them literally, wrap it in `re.escape()`:
`match=re.escape("amount must be > 0 (got -5)")`.

To look at the exception itself, write `as excinfo`. After the block, `excinfo.value` is the
exception object, which is how you check the attributes of a custom exception (module 6):

```python
import pytest


class CardDeclined(Exception):
    def __init__(self, code):
        super().__init__(f"card declined: {code}")
        self.code = code


def authorize(amount_pence, limit_pence):
    if amount_pence > limit_pence:
        raise CardDeclined("limit_exceeded")
    return "AUTH-1042"


with pytest.raises(CardDeclined) as excinfo:
    authorize(90_000, limit_pence=50_000)

excinfo.value.code
```

> [!WARNING]
> Put only the call that should raise inside the `with` block. Anything after it in the block never
> runs, because the exception jumps straight out of the block. An `assert balance == 100` placed
> there looks like a check but can never fail. Put it after the block.

```quiz
question: "A test has `with pytest.raises(ValueError):` around `charge(wallet, -5)`, but `charge` raises `TypeError` for negative amounts. What happens?"
options:
  - "The test passes: an error was raised"
  - "The test fails with DID NOT RAISE"
  - "The test fails with the TypeError"
answer: 2
explain: pytest.raises only catches the type you name and its subclasses. Any other exception passes straight through, and the test fails with it, which tells you exactly what was raised instead.
```

## Floats: why == lets you down

Floating-point numbers are stored in binary, and most decimal fractions can't be represented
exactly. The error is tiny, but `==` notices it:

```python
0.1 + 0.2 == 0.3, 0.1 + 0.2
```

A test of a float result with `==` can fail on correct code, just because the code adds its
numbers in a different order than you did in your head. `pytest.approx` wraps an expected value so
that `==` means "close enough":

```python
import pytest

(
    0.1 + 0.2 == pytest.approx(0.3),
    19.99 * 3 == pytest.approx(59.97),
    [0.1 + 0.2, 0.7 * 3] == pytest.approx([0.3, 2.1]),
)
```

By default "close enough" is a **relative** tolerance of one part in a million (`rel=1e-6`), so
it scales with the size of the number: 1,000,000.4 is approximately 1,000,000, but 1.4 isn't
approximately 1. Set your own with `rel=` or with an **absolute** tolerance, `abs=`:

```python
import pytest

(
    1.001 == pytest.approx(1),
    1.001 == pytest.approx(1, rel=0.01),
    100.4 == pytest.approx(100, abs=0.5),
)
```

`approx` works on single numbers and on lists, tuples and dicts of numbers, comparing item by item.

## approx, or Decimal?

`approx` is for values that are genuinely approximate: averages, interest calculations, unit
conversions, anything from `math` or `statistics`. **Money is different.** A payment is right to
the penny or it's wrong, so money code should use `Decimal` (module 1), and its tests should
compare exactly: `assert total == Decimal("19.99")`. Wrapping money in `approx` hides exactly the
rounding bugs you want to catch.

```quiz
question: Which assertion is right for a function that returns a monthly loan repayment as a float, such as 860.664...?
options:
  - "assert monthly_payment(10_000, 0.06, 12) == 860.66"
  - "assert monthly_payment(10_000, 0.06, 12) == pytest.approx(860.66, abs=0.01)"
  - "assert round(monthly_payment(10_000, 0.06, 12)) == 861"
answer: 1
explain: The exact float will never equal 860.66, and rounding to whole pounds would accept wrong answers up to 50p out. approx with an absolute tolerance of a penny says exactly what you mean.
```

## Where this leaves you

`pytest.raises` checks that code raises a given exception type, `match=` checks its message with a
regex, and `as excinfo` gives you the exception object to inspect. Only the raising call goes in the
`with` block. `pytest.approx` compares floats with a relative or absolute tolerance, and money
stays in `Decimal` and is compared exactly.
