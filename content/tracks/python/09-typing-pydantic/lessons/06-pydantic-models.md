---
slug: pydantic-models
title: Pydantic models
summary: Turn type hints into runtime validation, so data from outside your program is checked and converted the moment it arrives.
minutes: 45
exercises:
  - pydantic-customer-model
  - pydantic-predict-coercion
  - pydantic-fix-checkout-request
  - pydantic-parse-order-webhook
  - pydantic-product-catalogue
---

mypy checks the code you wrote. It can't check the JSON a payment provider posts to your webhook, a
CSV a supplier emails you, or a form a customer fills in. Lesson 3 ended on exactly that gap: a
`TypedDict` hint on `json.loads` output is a promise nobody verifies. **Pydantic** reads the same
kind of type hints and enforces them at runtime: it checks the data, converts it to the types you
asked for, and tells you precisely what's wrong when it can't. This lesson covers models, conversion,
defaults, constraints, nested data and parsing JSON.

## A first model

A model is a class that inherits from `BaseModel`, with one annotated attribute per field. It looks
like a dataclass, and the difference is what happens when you create one:

```python
from pydantic import BaseModel


class Customer(BaseModel):
    email: str
    name: str
    marketing_opt_in: bool = False


ada = Customer(email="ada@example.com", name="Ada")
ada, ada.name, ada.marketing_opt_in
```

Leave out a required field, or pass something that can't be a `str`, and creation fails with
`pydantic.ValidationError`, which lists every problem, not just the first:

```python raises
from pydantic import BaseModel


class Customer(BaseModel):
    email: str
    name: str
    marketing_opt_in: bool = False


Customer(email=1042, marketing_opt_in="perhaps")
```

A model is also an ordinary typed class, so mypy checks code that builds one. Pydantic marks
`BaseModel` as dataclass-like for type checkers, and mypy reads the fields as the constructor's
parameters. Here's mypy on that same call:

```text
billing.py:10: error: Missing named argument "name" for "Customer"  [call-arg]
billing.py:10: error: Argument "email" to "Customer" has incompatible type "int"; expected "str"  [arg-type]
billing.py:10: error: Argument "marketing_opt_in" to "Customer" has incompatible type "str"; expected "bool"  [arg-type]
```

The two tools split the work: mypy checks the models your own code builds, before it runs, and
Pydantic checks the data that arrives from outside, when it does.

> [!JS]
> Coming from TypeScript: Pydantic is zod. The difference is that you don't write
> `z.object({...})` and then `z.infer<typeof Customer>`: the class is the schema and the type at
> the same time.

## Conversion, not just checking

By default Pydantic is **lax**: when a value isn't the right type but can be converted without
losing information, it converts it. That's what you want for data from forms, query strings and
environment variables, where everything arrives as text:

```python
from pydantic import BaseModel


class LineItem(BaseModel):
    sku: str
    quantity: int
    gift_wrap: bool = False


LineItem.model_validate({"sku": "MUG-01", "quantity": "3", "gift_wrap": "yes"})
```

`model_validate` builds a model from a dict. The rules are about not guessing:

| Field type | Accepts and converts | Refuses |
|------------|----------------------|---------|
| `int` | `"3"`, `" 7 "`, `2.0` | `2.5` (it would lose the fraction), `"three"` |
| `float` | `"19.99"`, `3` | `"cheap"` |
| `bool` | `"yes"`/`"no"`, `"true"`/`"false"`, `"on"`/`"off"`, `1`/`0` | `"perhaps"`, `2` |
| `str` | text | numbers: `1042` is refused, not turned into `"1042"` |
| `Decimal`, `date`, `datetime` | ISO text such as `"12.50"`, `"2026-09-29"` | `"29/09/2026"` |

When you want no conversion at all, set `model_config = ConfigDict(strict=True)` on the model (or
`Field(strict=True)` on one field). Then `"3"` is refused for an `int`.

```quiz
question: "`quantity: int`. Which input does Pydantic's default mode refuse?"
options:
  - '"12"'
  - "12.0"
  - "12.5"
answer: 2
explain: "12.5 can't become an int without losing the .5, so it's refused. \"12\" and 12.0 convert cleanly to 12."
```

## Required, optional and defaults

Here's the trap. In Pydantic, a field is optional only if it has a **default**. The type
`str | None` says `None` is an allowed value; it doesn't make the field optional:

```python raises
from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    cart_id: str
    coupon: str | None


CheckoutRequest(cart_id="c_981")
```

Give it a default of `None` and it can be left out:

```python
from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    cart_id: str
    coupon: str | None = None
    tags: list[str] = []


first = CheckoutRequest(cart_id="c_981")
second = CheckoutRequest(cart_id="c_982")
first.tags.append("gift")
first.coupon, second.tags
```

The `tags: list[str] = []` default is safe here. Module 3's mutable-default trap doesn't apply,
because Pydantic copies the default for each new model. `Field(default_factory=...)` is still the
way to compute a default, such as the current time.

## Constraints with Field

Types say what kind of value a field holds; constraints say which values are allowed. They go in
`Field(...)`, alongside the default if there is one:

```python raises
from decimal import Decimal

from pydantic import BaseModel, Field


class Product(BaseModel):
    sku: str = Field(pattern=r"^[A-Z0-9]+(-[A-Z0-9]+)*$")
    name: str = Field(min_length=1, max_length=80)
    price: Decimal = Field(gt=0, max_digits=8, decimal_places=2)
    stock: int = Field(default=0, ge=0)


Product(sku="mug-01", name="Stoneware mug", price="8.001", stock=-1)
```

| Constraint | For | Means |
|------------|-----|-------|
| `gt`, `ge`, `lt`, `le` | numbers | greater than, greater or equal, less than, less or equal |
| `min_length`, `max_length` | strings and lists | length limits |
| `pattern` | strings | must match this regular expression |
| `max_digits`, `decimal_places` | `Decimal` | limits on the digits |

When the same rule appears in several models, give it a name. `Annotated` attaches the `Field` to
the type, and a `type` alias names the result:

```python
from typing import Annotated

from pydantic import BaseModel, Field

type Quantity = Annotated[int, Field(gt=0, le=100)]


class CartLine(BaseModel):
    sku: str
    quantity: Quantity


CartLine(sku="MUG-01", quantity="4")
```

## Nested models and error locations

A field's type can be another model, or a list of them. Pydantic validates the whole tree, and each
error's `loc` says exactly where it is: field names, and list indexes as ints.

```python
from pydantic import BaseModel, Field, ValidationError


class LineItem(BaseModel):
    sku: str
    quantity: int = Field(gt=0)


class Order(BaseModel):
    order_id: str
    lines: list[LineItem] = Field(min_length=1)


try:
    Order.model_validate({"order_id": "A1042", "lines": [{"sku": "MUG-01", "quantity": 2}, {"quantity": 0}]})
except ValidationError as error:
    for problem in error.errors():
        print(problem["loc"], problem["msg"])
```

`error.errors()` is a list of dicts with the location, the message, a machine-readable `type` such
as `"greater_than"`, and the input that failed. It's the raw material for an API's error response:
one line per field, precise enough for the client to fix the request.

## Parsing untrusted JSON

For JSON text, skip `json.loads` and call `model_validate_json`. It parses and validates in one step,
it's faster, and a body that isn't valid JSON raises the same `ValidationError` as a body with the
wrong fields, so there's one exception to handle:

```python
from datetime import datetime

from pydantic import BaseModel, ValidationError


class PaymentSucceeded(BaseModel):
    payment_id: str
    order_id: str
    amount_cents: int
    paid_at: datetime


raw = '{"payment_id": "pay_881", "order_id": "A1042", "amount_cents": 4050, "paid_at": "2026-09-29T10:15:00Z"}'
event = PaymentSucceeded.model_validate_json(raw)
print(event.paid_at.year, event.amount_cents)

for body in ['{"payment_id": "pay_882"', '{"payment_id": "pay_883", "order_id": "A1043", "amount_cents": "a lot"}']:
    try:
        PaymentSucceeded.model_validate_json(body)
    except ValidationError as error:
        print(error.error_count(), "problem(s):", error.errors()[0]["msg"])
```

Unknown keys are ignored by default, so a provider adding a field doesn't break your webhook. When
you'd rather refuse them, for example in your own API where an unknown key is probably a typo, set
`model_config = ConfigDict(extra="forbid")`.

> [!WARNING]
> Validation runs when a model is created. Assigning to a field afterwards (`event.amount_cents =
> "a lot"`) isn't checked unless the model sets `ConfigDict(validate_assignment=True)`, or is made
> immutable with `frozen=True`.

## Where this leaves you

A Pydantic model is a typed class that validates its data when it's created, converting values that
convert cleanly and refusing the rest with a `ValidationError` that lists every problem and where it
is. A field is optional only when it has a default, `Field` adds constraints, nested models validate
the whole tree, and `model_validate_json` parses untrusted JSON in one step. The next lesson adds
your own rules with validators, and turns models back into JSON.
