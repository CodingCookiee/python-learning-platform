---
slug: custom-exceptions
title: Custom exceptions and exception groups
summary: Design an exception hierarchy that lets callers handle each failure the right way, and report several failures at once with ExceptionGroup and except*.
minutes: 45
exercises:
  - errors-statement-hierarchy
  - errors-predict-except-order
  - errors-insufficient-funds
  - errors-refactor-error-codes
  - errors-validate-customer
  - errors-fix-except-star
---

A checkout calls a payment service. A declined card means "ask for another card". A gateway
outage means "try again in a minute". A negative amount means the checkout itself has a bug. If
the service raises `ValueError` for all three, the checkout can't tell them apart without reading
the message text, and message text changes. Your own exception classes give each failure a type
that callers can catch by name.

## An exception class is a class

Any class that inherits from `Exception` can be raised and caught. It usually needs no body beyond
a docstring:

```python
class PaymentError(Exception):
    """Something went wrong taking a payment."""


class CardDeclined(PaymentError):
    """The card issuer refused the charge."""


def take_payment(card, amount):
    if card.startswith("4000"):
        raise CardDeclined(f"card ending {card[-4:]} was declined")
    return f"paid {amount}"


try:
    take_payment("4000000000000002", 25)
except CardDeclined as error:
    reply = f"Please try another card ({error})"
reply
```

Inherit from `Exception`, never from `BaseException`: that one is reserved for `KeyboardInterrupt`
and `SystemExit`, which ordinary `except Exception` handlers are supposed to let through.

> [!JS]
> Coming from JavaScript: this is `class CardDeclined extends Error`, minus the boilerplate. There's
> no `this.name` to set: Python prints the class name in tracebacks for you.

## One base class, subclasses for different handling

For a library or a domain, the usual design is a single base class, with one subclass for each
failure a caller might want to handle *differently*:

```text
PaymentError                  catch this to handle every payment failure
 ├── CardDeclined             ask the customer for another card
 │    └── FraudSuspected      ...and alert the fraud team
 ├── GatewayUnavailable       retry later
 └── InvalidAmount            a bug in the caller: fix the code
```

Four rules keep a hierarchy useful:

1. **One base class** for everything your code raises on purpose, so a caller can write
   `except PaymentError` and know it means "the payment failed", not "something crashed".
2. **A subclass only when a caller will catch it separately.** If every caller treats two
   failures the same way, they're one class with two messages.
3. **Group by how it's handled, not where it's raised.** `CardDeclined` is one class whether the
   issuer, the fraud check or the card-expiry check refused the card.
4. **Keep bugs out.** A `TypeError` from a typo in your own code should stay a `TypeError`; don't
   wrap every error in `PaymentError`.

```python
class PaymentError(Exception):
    pass

class CardDeclined(PaymentError):
    pass

class GatewayUnavailable(PaymentError):
    pass


def checkout(error):
    try:
        raise error
    except CardDeclined:
        return "Please use another card"
    except GatewayUnavailable:
        return "Payments are down, we'll retry in a minute"
    except PaymentError:
        return "Payment failed"


[checkout(e) for e in (CardDeclined(), GatewayUnavailable(), PaymentError())]
```

> [!TIP]
> PEP 8, the style guide, suggests ending exception names in `Error`. Most libraries do for their
> base class (`PaymentError`, `requests.RequestException`) and drop it where a leaf reads better
> as a sentence: `except CardDeclined:`.

## Also inherit from a built-in

An invalid amount is a payment problem, but it's also a plain bad value, and generic code (a web
framework turning `ValueError` into a 400 response, say) should still recognise it. Multiple
inheritance lets one exception be both:

```python
class PaymentError(Exception):
    pass

class InvalidAmount(PaymentError, ValueError):
    pass


def charge(amount):
    if amount <= 0:
        raise InvalidAmount(f"amount must be positive, got {amount}")


caught_as = []
for handler_type in (InvalidAmount, PaymentError, ValueError):
    try:
        charge(-5)
    except handler_type:
        caught_as.append(handler_type.__name__)
caught_as
```

`LookupError` (for "no such account") and `ConnectionError` (for "gateway unreachable") are the
other built-ins worth mixing in this way.

## Exceptions that carry data

An exception is an object, so it can carry the facts a handler needs, not just a sentence. Store
them as attributes, and pass a readable message up to `Exception.__init__` with `super().__init__`,
which is where `str(error)` gets its text:

```python
from decimal import Decimal

class PaymentError(Exception):
    pass


class InsufficientFunds(PaymentError):
    def __init__(self, balance, amount):
        self.balance = balance
        self.amount = amount
        super().__init__(f"balance {balance} is {amount - balance} short of {amount}")


try:
    raise InsufficientFunds(Decimal("20.00"), Decimal("50.00"))
except InsufficientFunds as error:
    details = (str(error), error.amount - error.balance)
details
```

A handler can now offer "top up 30.00" without parsing the message. If you forget the
`super().__init__(...)` call, `str(error)` falls back to showing the raw constructor arguments,
`(Decimal('20.00'), Decimal('50.00'))`, which is not a message anyone wants in a log.

```quiz
question: "With class InvalidAmount(PaymentError, ValueError), which handler does NOT catch InvalidAmount()?"
options:
  - "except ValueError:"
  - "except PaymentError:"
  - "except TypeError:"
  - "except Exception:"
answer: 2
explain: An except clause matches with isinstance, and InvalidAmount is an instance of both of its bases and everything above them, including Exception. It has nothing to do with TypeError.
```

## Several failures at once: ExceptionGroup

Validation has a problem that `raise` can't solve: a signup form with a blank name, a bad email and
an age of 12 has three problems, and raising the first one means the customer fixes one, submits,
and hears about the next. An **exception group** carries several exceptions as one:

```python
import traceback

class FieldError(ValueError):
    def __init__(self, field, problem):
        self.field = field
        super().__init__(f"{field} {problem}")


errors = [FieldError("name", "is required"), FieldError("email", "must contain @")]
group = ExceptionGroup("invalid signup", errors)
print("".join(traceback.format_exception(group)))
group.message, group.exceptions
```

`ExceptionGroup(message, exceptions)` takes a message and a non-empty list. The group is an
exception itself, so you raise it like any other, and its traceback shows every member as a tree.

> [!JS]
> Coming from JavaScript: this is `AggregateError`, the error `Promise.any` throws, with its list
> of errors in `.errors`. Python's version has its own `except*` syntax for handling it.

## Handling groups with except*

A plain `except FieldError` doesn't match a group, because the group is an `ExceptionGroup`, not a
`FieldError`. `except*` looks *inside* the group instead. Each `except*` clause receives a smaller
group holding just the members that match it, and runs once at most. Whatever no clause matched is
raised again, as a group, when the `try` statement ends:

```python
class FieldError(ValueError):
    pass


def validate(record):
    raise ExceptionGroup("invalid signup", [
        FieldError("name is required"),
        FieldError("email must contain @"),
        KeyError("referral_code"),
    ])


try:
    try:
        validate({})
    except* FieldError as group:
        print("show the customer:", [str(e) for e in group.exceptions])
except ExceptionGroup as rest:
    print("still unhandled:", rest.exceptions)
```

The `FieldError` clause handled two members, and the `KeyError`, which nothing matched, escaped in
a group of its own. Several `except*` clauses can each take their share of the same group, which
is how concurrent code (module 12) handles tasks that failed in different ways.

A few rules come with `except*`: one `try` can't mix `except` and `except*` clauses, and an
`except*` block can't use `return`, `break` or `continue`, because other clauses may still have
their share of the group to handle. A plain exception raised in the `try` block is matched too, as
if it were a group of one.

## Taking a group apart by hand

When you'd rather just loop over the members, catch the group with a plain `except` and read
`.exceptions`. `subgroup(type)` returns a group of just the matching members (or `None`), and
`split(type)` returns the matching and non-matching parts as a pair:

```python
class FieldError(ValueError):
    pass


group = ExceptionGroup("invalid signup", [FieldError("name is required"), KeyError("referral_code")])
fields, others = group.split(FieldError)
[str(e) for e in group.exceptions], fields.exceptions, others.exceptions
```

Reach for an exception group only when you genuinely collected several independent failures:
validating every field, or several tasks that ran side by side. A single failure is a single
exception.

## Where this leaves you

Give your domain one base exception class and a subclass for each failure a caller handles
differently. Mix in a built-in such as `ValueError` or `LookupError` when generic code should
recognise it too, and give exceptions attributes for the facts handlers need. When you have several
failures to report at once, raise an `ExceptionGroup`, and handle it with `except*` clauses, or by
catching it and looping over `.exceptions`.
