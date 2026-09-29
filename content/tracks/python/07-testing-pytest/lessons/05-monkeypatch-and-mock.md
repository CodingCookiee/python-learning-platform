---
slug: monkeypatch-and-mock
title: monkeypatch, mocks and patch
summary: Stand in for environment variables, payment gateways and email senders, patch names where they're looked up, and know when mocking has gone too far.
minutes: 45
exercises:
  - pytest-payments-mode-env
  - pytest-predict-mock-calls
  - pytest-checkout-gateway-mock
  - pytest-patch-where-used
  - pytest-inject-the-clock
---

Real code talks to things a test can't use. It reads an environment variable to decide whether
payments are live, charges cards through a gateway, sends welcome emails, asks the clock what day
it is. A test that charged a real card or emailed a real customer would be a disaster, and one
that depended on today's date would pass today and fail next week. The fix is to put a stand-in in
place of the real thing for the length of one test.

## monkeypatch: change something for one test

`monkeypatch` is a built-in fixture (ask for it by name, like any fixture). It changes environment
variables, attributes and dict items, and **puts everything back** when the test ends, pass or
fail:

```python norun
import config


def test_payments_default_to_sandbox(monkeypatch):
    monkeypatch.delenv("PAYMENTS_MODE", raising=False)   # make sure it isn't set
    assert config.payments_mode() == "sandbox"


def test_live_mode_is_read_from_the_environment(monkeypatch):
    monkeypatch.setenv("PAYMENTS_MODE", "live")
    assert config.payments_mode() == "live"
```

The methods you'll use most:

| Call | Does, until the test ends |
|------|---------------------------|
| `monkeypatch.setenv("NAME", "value")` | sets an environment variable |
| `monkeypatch.delenv("NAME", raising=False)` | removes one (no error if it wasn't set) |
| `monkeypatch.setattr(obj, "name", value)` | replaces an attribute of a module, class or object |
| `monkeypatch.setitem(mapping, key, value)` | sets a dict item |
| `monkeypatch.chdir(path)` | changes the working directory |

Setting `os.environ["PAYMENTS_MODE"] = "live"` directly in a test would work too, once. But it
stays set for every test after it, and the suite starts passing or failing depending on the order
the tests run in. The undo is the point of `monkeypatch`. Outside a test you can try it with
`pytest.MonkeyPatch.context()`, which undoes everything at the end of the `with` block:

```python
import os

import pytest

with pytest.MonkeyPatch.context() as mp:
    mp.setenv("PAYMENTS_MODE", "live")
    inside = os.environ["PAYMENTS_MODE"]

inside, os.environ.get("PAYMENTS_MODE")
```

## Mock objects

Sometimes you need a whole stand-in object, like a payment gateway that the code under test calls.
`unittest.mock.Mock` (in the standard library) creates an object that accepts **any** attribute
and **any** call, and records every call made to it:

```python
from unittest.mock import Mock

gateway = Mock()
gateway.charge.return_value = {"id": "ch_1042", "status": "succeeded"}

result = gateway.charge(1999, "GBP", idempotency_key="order-1042")

result, gateway.charge.call_count, gateway.charge.call_args
```

`gateway.charge` didn't exist until it was used: a Mock makes child mocks on demand. You set what a
call returns with `return_value`, and afterwards you ask what happened. The assertion methods raise
`AssertionError` with a clear message when the call doesn't match:

```python norun
gateway.charge.assert_called_once_with(1999, "GBP", idempotency_key="order-1042")
gateway.refund.assert_not_called()
```

`side_effect` makes a call do something other than return a value: raise an exception, or return
values from a list, one per call:

```python raises
from unittest.mock import Mock


class PaymentDeclined(Exception):
    pass


gateway = Mock()
gateway.charge.side_effect = PaymentDeclined("insufficient funds")
gateway.charge(1999, "GBP")
```

That's how a test checks the unhappy path, what your checkout does when the card is declined,
without needing a card that really gets declined.

> [!JS]
> Coming from Jest: `Mock()` is `jest.fn()`, `return_value` is `mockReturnValue`, `side_effect`
> covers `mockImplementation` and `mockRejectedValue`, and `assert_called_once_with(...)` is
> `expect(fn).toHaveBeenCalledWith(...)` plus a call count check.

> [!WARNING]
> A bare `Mock()` accepts anything, including typos: `gateway.chrage(1999)` quietly succeeds.
> `Mock(spec=Gateway)` only allows attributes the real `Gateway` class has, so a misspelt method
> raises `AttributeError` instead of passing.

```quiz
question: "`sender = Mock(return_value=True)`, then `sender(\"ada@example.com\")` and `sender(\"grace@example.com\")`. Which assertion passes?"
options:
  - "sender.assert_called_once_with(\"ada@example.com\")"
  - "sender.assert_called_with(\"grace@example.com\")"
  - "sender.assert_called_with(\"ada@example.com\")"
answer: 1
explain: assert_called_with checks only the most recent call, which was for grace. assert_called_once_with also checks there was exactly one call, and there were two.
```

## patch: replace a name where it's looked up

When the code under test finds its dependency by importing it, rather than taking it as a
parameter, you have to swap the name itself. `unittest.mock.patch` replaces a name with a Mock for
the length of a `with` block (or a decorated test), then puts the original back:

```python norun
# signup.py
from mailer import send_email


def register(email):
    ...
    send_email(email, "Welcome to Harbour Books", body)
```

```python norun
# test_signup.py
from unittest.mock import ANY, patch

from signup import register


def test_register_sends_a_welcome_email():
    with patch("signup.send_email") as send_email:
        register("ada@example.com")
    send_email.assert_called_once_with("ada@example.com", "Welcome to Harbour Books", ANY)
```

(`ANY` compares equal to anything, for an argument you don't care about.)

The string names **where the code under test looks the name up**, which is `signup.send_email`,
not `mailer.send_email`. Here's why. `from mailer import send_email` runs once, when `signup` is
imported, and binds the name `send_email` in signup's namespace to the function object. From then
on `signup` never looks at `mailer` again. Patching `mailer.send_email` rebinds the name in
`mailer`, and `signup` still holds the real function. You can watch the same thing happen with
plain names:

```python
import types

mailer = types.SimpleNamespace(send_email=lambda to: f"REAL email sent to {to}")

send_email = mailer.send_email              # what "from mailer import send_email" does

mailer.send_email = lambda to: "fake"       # patching the name in mailer...
send_email("ada@example.com")               # ...doesn't change the copy
```

The rule of thumb: patch the module that **uses** the name. If `signup.py` had done `import mailer`
and called `mailer.send_email(...)`, it would look the name up in `mailer` on every call, and then
`patch("mailer.send_email")` would be right.

> [!JS]
> Coming from Jest: `jest.mock("./mailer")` replaces the module for everyone who imports it.
> `patch` is narrower: it rebinds one name in one namespace, which is why the target matters.

## When mocking goes too far

Mocks check **interactions**, which calls were made, not **results**. That makes them easy to
overuse. Signs a test has gone too far:

- It patches the helper functions of the code it's testing, so it checks how the code is
  written rather than what it does. Rename a helper and the test breaks, even though nothing a
  caller sees has changed.
- It asserts the exact order of internal calls.
- Mocks return mocks that return mocks, and the test is mostly setup.
- It passes when the code is wrong, because the part that's wrong was mocked out.

Mock at the **boundary**: the payment gateway, the email service, the network, the clock. Never
mock your own logic; call it for real and check what comes out. And where you can, don't patch
at all: **pass the dependency in**. A function that takes `gateway` as a parameter can be tested
with a Mock or a small fake class, with no patching and no question about targets. A function that
takes `today` as a parameter needs no mock at all:

```python
from datetime import date, timedelta


def trial_days_left(signed_up, today):
    ends = signed_up + timedelta(days=14)
    return max(0, (ends - today).days)


trial_days_left(date(2026, 9, 1), today=date(2026, 9, 10))
```

Compare that with patching the clock, where `datetime.date` is a built-in type whose attributes you
can't even set. The caller at the edge of the program passes `date.today()`, and everything inside
is plain, testable logic.

```quiz
question: "checkout(order, gateway) charges the order and returns a receipt. Which test is testing behaviour?"
options:
  - "Patch checkout's _build_receipt helper and assert it was called once"
  - "Pass a Mock gateway, then check the returned receipt and that charge was called once with the right amount"
  - "Patch checkout itself and assert it returns the Mock's value"
answer: 1
explain: The gateway is the boundary, so mock it, and check what checkout returns and what it asked the gateway to do. Patching checkout's own helpers, or checkout itself, tests the mock rather than the code.
```

## Where this leaves you

`monkeypatch` changes environment variables and attributes for one test and undoes them. `Mock`
stands in for an object, returns what you tell it to, and records its calls. `patch` swaps a name
where the code under test looks it up. Mock at the boundaries of your system, check results as well
as calls, and prefer passing dependencies in, which often makes the mock unnecessary.
