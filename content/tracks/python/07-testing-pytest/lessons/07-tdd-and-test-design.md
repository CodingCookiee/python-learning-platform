---
slug: tdd-and-test-design
title: Test-driven development and test design
summary: Work red, green, refactor, start every bug fix with a failing test, and write focused tests that check behaviour rather than implementation.
minutes: 40
exercises:
  - pytest-red-first
  - pytest-make-it-green
  - pytest-over-mocked-test
  - pytest-one-behaviour-per-test
  - pytest-tdd-slug
---

You can now write tests for almost anything. This lesson is about two habits that decide whether a
suite helps or gets in the way: writing the test **before** the code, and writing tests that
check what the code does rather than how it does it. A good suite fails only when something
a caller can see is broken, and when it fails, its test names tell you what.

## Red, green, refactor

**Test-driven development** (TDD) is a short loop, repeated for each small piece of behaviour:

1. **Red.** Write a test for the next thing the code should do, run it, and watch it fail. The
   failure proves the test can fail, and that it fails for the right reason: an assertion about
   the behaviour, not a typo or a missing import.
2. **Green.** Write the simplest code that makes it pass. Simplest really means simplest; the next
   test will force the code to become general.
3. **Refactor.** With every test passing, clean up the code (and the tests). Run them after every
   change. Green means the clean-up didn't break anything.

Here's the loop for a library's late fees: no fee for up to 2 days late, then 50p for every day
late, capped at 15.00.

```python norun
# Red: the first behaviour
def test_no_fee_within_the_grace_period():
    assert late_fee(2) == Decimal("0.00")
```

It fails with `ImportError`, because `late_fee` doesn't exist yet. That's a failure, but not the
right one, so write a stub, `def late_fee(days_late): ...`, and run again. Now it fails with
`assert None == Decimal('0.00')`. That's the right reason. Green is one line:
`return Decimal("0.00")`. It looks like cheating, and it's deliberate: the next test forces the
real rule.

```python norun
# Red again: a behaviour the one-liner can't satisfy
def test_charges_for_every_day_once_past_the_grace_period():
    assert late_fee(3) == Decimal("1.50")
```

Green means writing the rule: `if days_late <= 2: return Decimal("0.00")`, then
`return days_late * Decimal("0.50")`. Next, a test for the cap turns red, `min(...)` makes it
green, and so on. Each step is small enough that when a test fails, you know exactly which change
did it.

> [!TIP]
> TDD works best where the rules are clear: pricing, validation, parsing, anything with a spec.
> When you're still exploring what a feature should be, sketch the code first, then write the
> tests before you rely on it.

## Start every bug fix with a failing test

The most valuable test-first habit needs no methodology at all. When a bug is reported, **write
a test that reproduces it before you touch the code**:

1. The bug report says "`save10` is rejected, but `SAVE10` works". Write
   `test_codes_are_not_case_sensitive`, which calls the code with `"save10"`.
2. Run it and see it fail. Now you know the test really exercises the bug. If it passes, you haven't
   reproduced the problem yet, and any fix you make is a guess.
3. Fix the code, and see the test pass.

The test stays in the suite for good, so this bug can never quietly come back.

## Arrange, act, assert

Most good tests have the same three parts, in order, often separated by blank lines:

- **Arrange**: build the objects and data the test needs (or ask for them as fixtures).
- **Act**: do the one thing being tested.
- **Assert**: check the result.

```python
from decimal import Decimal


class Cart:
    def __init__(self):
        self.lines = []

    def add(self, sku, quantity, unit_price):
        self.lines.append((sku, quantity, unit_price))

    def total(self, discount_percent=0):
        subtotal = sum(quantity * price for _, quantity, price in self.lines)
        return (subtotal * (100 - discount_percent) / 100).quantize(Decimal("0.01"))


def test_discount_applies_to_the_whole_cart():
    cart = Cart()                                  # arrange
    cart.add("MUG", 2, Decimal("8.00"))
    cart.add("TEA", 1, Decimal("4.00"))

    total = cart.total(discount_percent=10)        # act

    assert total == Decimal("18.00")               # assert


test_discount_applies_to_the_whole_cart()          # a test is just a function; no error means it passed
```

When a test doesn't fit this shape, with an act, then more arranging, then another act, it's
usually two tests.

## One behaviour per test

Here's the wrong way:

```python norun
def test_subscription():
    subscription = Subscription("basic")
    assert subscription.monthly_price() == 900
    subscription.change_plan("pro")
    assert subscription.monthly_price() == 2900
    subscription.cancel()
    assert subscription.bill() is None
    with pytest.raises(ValueError):
        subscription.change_plan("team")
```

When this fails, the report says `test_subscription FAILED`, which tells you nothing, and the first
failing assert stops the test, so a second bug further down stays hidden until the first is fixed.
Split it into one test per behaviour, each named after what it checks:

```python norun
def test_basic_plan_costs_9_a_month():
    assert Subscription("basic").monthly_price() == 900


def test_changing_plan_changes_the_price():
    subscription = Subscription("basic")
    subscription.change_plan("pro")
    assert subscription.monthly_price() == 2900


def test_a_cancelled_subscription_is_not_billed():
    subscription = Subscription("basic")
    subscription.cancel()
    assert subscription.bill() is None
```

Now a failure report is a list of broken behaviours in plain English. "One behaviour" doesn't
mean "one assert": checking the status and the charge ID of one checkout result is still one
behaviour.

```quiz
question: A test named test_checkout creates an order, checks it's charged, then refunds it and checks the balance. The refund check fails. What's the main cost of this test design?
options:
  - "The test runs more slowly"
  - "The failure is reported as test_checkout, so you have to read the test to find out which behaviour broke"
  - "pytest can't run tests with more than one assert"
answer: 1
explain: A test is reported by name. Separate tests for charging and refunding would say exactly which one broke, and a charging bug couldn't hide a refund bug.
```

## Test behaviour, not implementation

A test should break when something a caller relies on changes, and **only** then. The way to
get there is to test through the public interface: call the functions and methods other code
calls, and check what they return, raise, print or write.

Tests that reach inside break on every refactor while catching nothing new:

- They call private helpers (`_apply_discount`) directly, so renaming or merging a helper breaks
  them, although nothing a caller sees has changed.
- They patch the code's own helpers and assert they were called (lesson 5's "mocking too far").
- They check internal state, such as the list inside a class, instead of what its methods return.

Here's the test to apply: **if you could rewrite the implementation completely, and every caller
would still be happy, would this test still pass?** If not, it's testing the implementation. The
refactor step of TDD depends on this. Tests that are tied to the implementation make refactoring
feel dangerous, which is the opposite of what tests are for.

```quiz
question: invoice_total() used to call two private helpers, _subtotal() and _discount(). A refactor merges them into one loop, and every invoice total stays the same. Which test now fails?
options:
  - "One that checks invoice_total's result for an invoice with a discount"
  - "One that patches invoice._subtotal and asserts it was called once"
  - "Neither: the behaviour hasn't changed"
answer: 1
explain: The patching test depended on how invoice_total was written, so it breaks although nothing a caller sees has changed. The result test keeps passing, and it would have caught a real bug in the new loop.
```

## Where this leaves you

Red, green, refactor: see each test fail for the right reason, make it pass simply, then clean up
while everything is green. Start every bug fix with a test that reproduces it. Shape tests as
arrange, act, assert, give each one behaviour and a name that says which, and test through the
public interface so a refactor that keeps the behaviour keeps the tests green. The capstone puts
the whole module together: an untested legacy pricing module and three bugs to find.
