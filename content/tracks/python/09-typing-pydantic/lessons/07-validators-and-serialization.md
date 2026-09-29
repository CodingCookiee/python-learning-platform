---
slug: validators-and-serialization
title: Validators, serialization and settings
summary: Add your own rules to a model, speak an API's naming style in both directions, and load configuration from the environment.
minutes: 45
exercises:
  - pydantic-normalise-email
  - pydantic-refund-rules
  - pydantic-predict-dump
  - pydantic-camel-case-api
  - pydantic-settings-from-env
---

Types and `Field` constraints cover most rules, but not all of them. "Store the email lowercased",
"the refund can't exceed what was paid" and "the delivery window must end after it starts" are
rules about your business, not about types. And validation is only half of an API: the other half
is turning models back into JSON, often in a different naming style from your Python code. This
lesson covers validators, aliases, serialization, and a model for your own settings.

## Field validators

The tempting approach is to clean a value where it's used: `signup.email.strip().lower()` in the
sign-up endpoint, the password reset, the newsletter export. Sooner or later one place forgets. A
**field validator** puts the rule on the model, so every way of creating it applies the rule:

```python
from pydantic import BaseModel, field_validator


class Signup(BaseModel):
    email: str
    name: str

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value:
            raise ValueError("not an email address")
        return value


Signup(email=" Ada@Example.COM ", name="Ada"), Signup.model_validate_json('{"email": "GRACE@example.org", "name": "Grace"}')
```

The validator is a class method, and its name is up to you: `@field_validator("email")` is what
attaches it to the field. By default it runs **after** Pydantic has checked the type, so
`value` is already a `str`, and whatever it returns becomes the field's value. Raising `ValueError`
turns into a `ValidationError` located at that field:

```python raises
from pydantic import BaseModel, field_validator


class Signup(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value:
            raise ValueError("not an email address")
        return value


Signup(email="ada.example.com")
```

## Before validators: fixing the input's shape

Sometimes the raw input isn't in a shape Pydantic can convert. A form sends tags as one
comma-separated string, and the model wants a list. A validator with `mode="before"` runs **before**
type validation and receives the raw value, whatever it is, so it's typed `object`:

```python
from pydantic import BaseModel, field_validator


class ProductFilter(BaseModel):
    tags: list[str] = []

    @field_validator("tags", mode="before")
    @classmethod
    def split_tags(cls, value: object) -> object:
        if isinstance(value, str):
            return [tag.strip() for tag in value.split(",") if tag.strip()]
        return value


ProductFilter.model_validate({"tags": "gift, decaf ,"}), ProductFilter(tags=["mug"])
```

A before-validator only reshapes; the normal `list[str]` validation still runs on what it returns.
Leaving anything that isn't a string alone keeps that validation's error messages for bad input.

## Model validators: rules across fields

A rule that involves two fields can't live on either one. A model validator with `mode="after"` runs
once every field has been validated, receives the finished model as `self`, and returns it:

```python
from datetime import date
from typing import Self

from pydantic import BaseModel, ValidationError, model_validator


class DeliveryWindow(BaseModel):
    earliest: date
    latest: date

    @model_validator(mode="after")
    def ends_after_it_starts(self) -> Self:
        if self.latest < self.earliest:
            raise ValueError("latest can't be before earliest")
        return self


print(DeliveryWindow(earliest="2026-10-01", latest="2026-10-03"))
try:
    DeliveryWindow(earliest="2026-10-03", latest="2026-10-01")
except ValidationError as error:
    print(error.errors()[0]["loc"], error.errors()[0]["msg"])
```

The error's location is `()`, the model as a whole, because no single field is to blame. If a field
already failed its own validation, the model validator doesn't run at all, so inside it every field
is guaranteed to be valid.

```quiz
question: "A model must refuse an order whose `shipped_at` is earlier than its `paid_at`. Where does that rule go?"
options:
  - "A field validator on shipped_at"
  - "A model validator with mode=\"after\""
  - "A before-validator on paid_at"
answer: 1
explain: "The rule compares two fields, so it needs both already validated. A field validator only sees its own field's value; an after model validator sees the whole model."
```

## Aliases: other names on the wire

JavaScript clients send `orderId`; Python code wants `order_id`. An **alias** is the name a field
has in the data, while the attribute keeps its Python name:

```python
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class RefundRequest(BaseModel):
    order_id: str = Field(alias="orderId")
    amount_cents: int = Field(alias="amountCents")


class ShipmentUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, validate_by_name=True, validate_by_alias=True)

    tracking_number: str
    estimated_delivery: str | None = None


refund = RefundRequest.model_validate({"orderId": "A1042", "amountCents": 1600})
update = ShipmentUpdate.model_validate({"trackingNumber": "RA123"})
refund.order_id, update.tracking_number, ShipmentUpdate(tracking_number="RA124")
```

`alias_generator=to_camel` gives every field a camelCase alias without writing them out.
`validate_by_alias` accepts the aliases (the default), and `validate_by_name=True` also accepts the
Python names, which is what lets your own code write `ShipmentUpdate(tracking_number=...)`. mypy
only knows the field names, so that's the spelling to use in Python code:

```text
billing.py:15: error: Unexpected keyword argument "trackingNumber" for "ShipmentUpdate"; did you mean "tracking_number"?  [call-arg]
```

## Serialization: models back to data

`model_dump()` turns a model into a dict, and `model_dump_json()` into JSON text. Their options
decide what comes out:

```python
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class Refund(BaseModel):
    order_id: str = Field(alias="orderId")
    amount: Decimal
    requested_on: date
    note: str | None = None


refund = Refund.model_validate({"orderId": "A1042", "amount": "12.50", "requested_on": "2026-09-29"})
print(refund.model_dump())
print(refund.model_dump(mode="json", by_alias=True, exclude_none=True))
print(refund.model_dump_json(include={"order_id", "amount"}))
```

| Option | Effect |
|--------|--------|
| `mode="json"` | only JSON types: `Decimal`, `date` and friends become strings |
| `by_alias=True` | use the aliases as keys, for sending data back to the client |
| `exclude_none=True` | leave out fields that are `None` |
| `include={...}`, `exclude={...}` | pick fields by name |

`model_dump_json` always produces JSON types, and `indent=2` makes it readable. To use the aliases
without passing `by_alias=True` every time, set `serialize_by_alias=True` in the model's config.

> [!JS]
> Coming from TypeScript: with zod you `parse` on the way in and `JSON.stringify` on the way out,
> and a rename means writing a transform. Pydantic uses one alias for both directions, so the model
> stays the single description of the payload.

## Settings from the environment

Configuration is data from outside too: environment variables arrive as strings, and a typo in one
should stop the program at startup. A model is exactly the right tool. Lax conversion turns
`"true"` and `"8000"` into a bool and an int, `SecretStr` keeps an API key out of logs, and
`frozen=True` stops settings changing while the program runs:

```python
import os

from pydantic import BaseModel, ConfigDict, Field, SecretStr


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    database_url: str
    api_key: SecretStr
    debug: bool = False
    port: int = Field(default=8000, ge=1, le=65535)


# In production the deployment sets these; here the example sets them itself
os.environ.update({"SHOP_DATABASE_URL": "postgresql://shop@db/shop", "SHOP_API_KEY": "sk_live_51H8", "SHOP_DEBUG": "true"})

PREFIX = "SHOP_"
values = {name.removeprefix(PREFIX).lower(): value for name, value in os.environ.items() if name.startswith(PREFIX)}
settings = Settings.model_validate(values)
print(settings)
print(settings.port, settings.api_key.get_secret_value()[:7])
```

The prefix keeps your settings apart from `PATH`, `HOME` and everything else in the environment,
and unknown keys are ignored by default. Reading `os.environ` in exactly one place, and passing the
`Settings` object to whatever needs it, also makes the code easy to test: a test passes a dict
instead.

> [!NOTE]
> Real projects usually install `pydantic-settings`, whose `BaseSettings` does this for you and also
> reads `.env` files and nested settings. It isn't available in the browser, and the model above is
> the same idea written out by hand: that's all it is underneath.

## Where this leaves you

`@field_validator` adds a rule or a clean-up to one field, after type validation by default or
before it with `mode="before"`. `@model_validator(mode="after")` checks rules across fields on the
finished model. Aliases, written by hand or generated with `to_camel`, let the wire format and the
Python names differ, and `model_dump` with `mode`, `by_alias` and `exclude_none` controls what comes
back out. The same models load settings from the environment, with secrets kept secret. The
capstone puts all of it, and the whole module's typing, into one order API.
