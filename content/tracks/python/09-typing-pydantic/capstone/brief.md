Millstone Coffee, whose stock system you built in module 5, is opening an online shop. The
storefront is being written in TypeScript by another team, and the two teams have agreed on one
thing: the order API's JSON contract is defined once, in Python, and nothing that breaks it gets
past the front door. Last time a shop like this launched, a quantity of `0`, a currency the payment
provider didn't support and a coupon typed in lowercase all made it into the database.

You'll write that contract as one module, `orders_api.py`: the Pydantic models for order requests,
order responses, error responses and payment-provider webhooks, plus the functions that parse and
price an order. It must pass `mypy --strict`, so the rest of the backend gets the same guarantees
at type-check time that the models give at runtime. Build it in your own editor. The starter has
the catalogue, the pricing tables, the sample payloads and a `main()` that prints everything below
once your models work.

## A sample run

```text
$ uv run python orders_api.py
{
  "orderId": "ord_7f3k2m9q",
  "status": "pending",
  "createdAt": "2026-09-29T10:15:00Z",
  "currency": "GBP",
  "customerEmail": "ada@example.com",
  "lines": [
    {
      "sku": "ETH-250",
      "name": "Ethiopia Yirgacheffe, 250 g",
      "quantity": 2,
      "unitPrice": "9.50",
      "lineTotal": "19.00"
    },
    {
      "sku": "MUG-STN",
      "name": "Stoneware mug",
      "quantity": 1,
      "unitPrice": "14.00",
      "lineTotal": "14.00"
    }
  ],
  "shippingAddress": {
    "name": "Ada Lovelace",
    "line1": "12 St James's Square",
    "line2": null,
    "city": "London",
    "postcode": "SW1Y 4JH",
    "country": "GB"
  },
  "billingAddress": {
    "name": "Ada Lovelace",
    "line1": "12 St James's Square",
    "line2": null,
    "city": "London",
    "postcode": "SW1Y 4JH",
    "country": "GB"
  },
  "couponCode": "WELCOME10",
  "totals": {
    "subtotal": "33.00",
    "discount": "3.30",
    "shipping": "4.95",
    "total": "34.65"
  }
}

{
  "error": "invalid_request",
  "details": [
    {
      "field": "giftWrap",
      "message": "Extra inputs are not permitted"
    },
    {
      "field": "customerEmail",
      "message": "Value error, not an email address"
    },
    {
      "field": "currency",
      "message": "Input should be 'GBP', 'EUR' or 'USD'"
    },
    {
      "field": "lines.0.quantity",
      "message": "Input should be greater than 0"
    },
    {
      "field": "lines.1.sku",
      "message": "String should match pattern '^[A-Z0-9]+(-[A-Z0-9]+)*$'"
    },
    {
      "field": "shippingAddress.postcode",
      "message": "Field required"
    },
    {
      "field": "shippingAddress.country",
      "message": "String should match pattern '^[A-Z]{2}$'"
    }
  ]
}

ord_7f3k2m9q: payment of 34.65 captured
ord_7f3k2m9q: shipped with Royal Mail, tracking RA123456785GB
ord_2b8d4c1x: cancelled (Customer changed their mind)
Refused: Input tag 'order.refunded' found using 'type' does not match any of the expected tags: 'payment.captured', 'order.shipped', 'order.cancelled'

$ uv run mypy --strict orders_api.py
Success: no issues found in 1 source file
```

The first block is the response to the sample order: Ada's email was lowercased, her coupon
uppercased and applied, and her billing address filled in from her shipping address. The second is
the response to a request with seven problems, all reported at once, each at its camelCase path. The
last four lines are the webhook events: three understood, one refused.

## The design

| Piece | Kind | Job |
|-------|------|-----|
| `Currency`, `OrderStatus`, `Sku`, `Quantity`, `Money`, `CountryCode` | `type` aliases | Each rule, written once and reused by every model |
| `ApiModel` | base model | The config every model shares |
| `Address`, `LineItemIn`, `OrderRequest` | models | What the storefront sends |
| `LineItemOut`, `OrderTotals`, `OrderResponse` | models | What the API returns |
| `FieldError`, `ErrorResponse` | models | What the API returns for a bad request |
| `PaymentCaptured`, `OrderShipped`, `OrderCancelled`, `OrderEvent` | models and a union | What the payment provider posts to the webhook |
| `parse_order_request`, `price_order`, `error_response`, `parse_event`, `describe_event` | functions | Parsing, pricing and reporting |

The models describe data and check it; they don't know about prices or coupons. The business rules
live in `price_order`, which takes the catalogue as an argument so it can be tested with any
catalogue.

## Requirements

### Shared types

Write each constraint once, as a `type` alias, and use the alias in every model that needs it.
`Currency` (`"GBP"`, `"EUR"` or `"USD"`) and `OrderStatus` are in the starter. Add:

| Alias | Underlying type | Rule |
|-------|-----------------|------|
| `Sku` | str | uppercase letters and digits in groups joined by single hyphens: `ETH-250`, `MUG-STN` |
| `Quantity` | int | 1 to 100 |
| `Money` | Decimal | 0 or more, at most 10 digits with 2 decimal places |
| `CountryCode` | str | exactly two uppercase letters |

### The base model

`ApiModel` sets the configuration every other model inherits:

- On the wire, field names are camelCase (`customerEmail`); in Python they're snake_case
  (`customer_email`). Requests are accepted by alias, models built in Python code use the field
  names, and responses are serialised by alias.
- An unknown key is refused (`giftWrap` in the sample), so a typo in the storefront fails loudly.
- Surrounding whitespace is stripped from every string.
- Models are frozen: once validated, nothing can change them.

### Requests

- `Address`: `name` (1 to 100 characters), `line1` (1 to 100), `line2` (optional, `None` by
  default), `city` (1 to 60), `postcode` (2 to 10) and `country` (a `CountryCode`).
- `LineItemIn`: `sku` (a `Sku`) and `quantity` (a `Quantity`).
- `OrderRequest`: `customer_email`, `currency`, `lines` (1 to 50 `LineItemIn`), `shipping_address`,
  an optional `billing_address` and an optional `coupon_code`.
  - `customer_email` is lowercased, then must have some text, an `@` and a domain containing a
    dot, or it fails with `not an email address`.
  - `coupon_code` is uppercased; an empty one becomes `None`.
  - The same SKU on two lines fails with `sku ETH-250 appears more than once`.

### Responses

- `LineItemOut`: `sku`, `name`, `quantity`, `unit_price` and `line_total` (both `Money`).
- `OrderTotals`: `subtotal`, `discount`, `shipping` and `total`, all `Money`. It refuses a discount
  larger than the subtotal, and a total that isn't `subtotal - discount + shipping`.
- `OrderResponse`: `order_id` (`ord_` then 8 lowercase letters or digits), `status`, `created_at`
  (a timezone-aware datetime: a naive one is refused), `currency`, `customer_email`, `lines` (at
  least one), `shipping_address`, `billing_address`, `coupon_code` (the applied coupon, or `None`)
  and `totals`. It refuses a subtotal that isn't the sum of the line totals.

These validators mean a bug in `price_order` can't produce an inconsistent response: it fails with
a `ValidationError` instead.

### Errors

`FieldError(field, message)` and `ErrorResponse(error="invalid_request", details)`.
`error_response(error: ValidationError) -> ErrorResponse` builds one `FieldError` per problem:
`field` is the error's location joined with dots (`lines.0.quantity`), or `body` when the location
is empty (invalid JSON, or a rule from a model validator); `message` is Pydantic's message.

### Webhook events

The payment provider posts three kinds of event, told apart by their `type` field:

| `type` | Model | Other fields |
|--------|-------|--------------|
| `"payment.captured"` | `PaymentCaptured` | `order_id`, `amount` (`Money`), `captured_at` (timezone-aware) |
| `"order.shipped"` | `OrderShipped` | `order_id`, `carrier`, `tracking_number` |
| `"order.cancelled"` | `OrderCancelled` | `order_id`, `reason` (not empty) |

`OrderEvent` is the union of the three, discriminated on `type`, so Pydantic goes straight to the
right model and reports an unknown type clearly. `parse_event(raw: str | bytes) -> OrderEvent`
parses one event, and `describe_event(event: OrderEvent) -> str` returns the lines in the sample
run, using `match` on the event's class.

### Pricing: `price_order`

`price_order(request, catalogue, *, order_id, created_at) -> OrderResponse`, all in `Decimal`:

1. Each line's unit price is the catalogue price in the request's currency, and its line total is
   the unit price times the quantity. A SKU that isn't in the catalogue raises
   `ValueError("unknown sku GRD-HND")`.
2. The subtotal is the sum of the line totals.
3. A coupon in `COUPONS` takes that fraction off the subtotal, rounded half up to the cent. An
   unknown coupon is ignored, and the response's `coupon_code` is then `None`.
4. Shipping is free when the subtotal after the discount reaches `FREE_SHIPPING_FROM` for the
   currency, and `SHIPPING` for the currency otherwise.
5. The total is the subtotal, minus the discount, plus shipping. The status is `"pending"`, and the
   billing address is the shipping address when the request didn't give one.

### Typing

`uv run mypy --strict orders_api.py` passes with no errors. No `# type: ignore`, no `cast`, and no
`Any` in your own signatures. Validators are annotated like any other method.

## Getting started

1. Create a project with `uv init`, add `uv add pydantic` and `uv add --dev mypy`, and copy the
   starter into `orders_api.py`. Until the models are written, running it fails in `main()`;
   that's expected.
2. Write the shared types and `ApiModel`, then `Address` and `LineItemIn`. Try them in the REPL:
   `LineItemIn(sku="ETH-250", quantity=0)` should raise, and so should
   `LineItemIn.model_validate({"sku": "ETH-250", "quantity": 1, "colour": "red"})`.
3. Write `OrderRequest` and `parse_order_request`, and check the sample request parses. Run mypy
   now, not at the end: fixing one error at a time is much easier than fixing forty.
4. Write the response models, then `price_order`, and compare the first block of output with the
   sample.
5. Write `FieldError`, `ErrorResponse` and `error_response`, then the event models, `parse_event`
   and `describe_event`. Compare the whole run with the sample, then run mypy once more.

### Things the lessons didn't cover

- **Discriminated unions.** `Annotated[PaymentCaptured | OrderShipped | OrderCancelled,
  Field(discriminator="type")]`, where each model's `type` field is a different `Literal`, tells
  Pydantic to read `type` first and validate only against the matching model. Name it with
  `type OrderEvent = ...`.
- **Validating something that isn't a model.** A union isn't a `BaseModel`, so it has no
  `model_validate_json`. `TypeAdapter` gives any type the same methods:
  `EVENTS: TypeAdapter[OrderEvent] = TypeAdapter(OrderEvent)` at module level, then
  `EVENTS.validate_json(raw)`.
- **Timezone-aware datetimes.** Pydantic's `AwareDatetime` is a `datetime` that refuses a value
  without a timezone. mypy sees it as a plain `datetime`.
- **Serialising by alias.** `serialize_by_alias=True` in the config makes `model_dump_json()` use
  the camelCase names without passing `by_alias=True` every time.
- **Rounding money.** `(subtotal * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)` rounds to
  the cent the way a shop expects, where `round()` would round half to even.
- **Error locations.** Pydantic reports a location using the name it was validated with, which for
  a request is the alias. That's why the error response says `shippingAddress.postcode`, exactly
  what the TypeScript team needs to highlight the right form field.
- **Matching on classes.** `case PaymentCaptured():` matches an instance of that class, and inside
  the case mypy narrows `event` to it. With a case for each member of the union, mypy knows the
  `match` is exhaustive and needs no final `return`.

## Try these

Before you submit, check each of these, starting from the sample request:

- Four bags of Ethiopia and a mug in GBP with `WELCOME10`: subtotal `52.00`, discount `5.20`, free
  shipping (46.80 is over 40.00), total `46.80`.
- The sample order in EUR without a coupon: subtotal `38.50`, shipping `5.95`, total `44.45`.
- The sample order with the coupon `FREESTUFF`: no discount, total `37.95`, and `couponCode` is
  `null`.
- The same SKU on two lines: one `FieldError` with field `body` and the message
  `Value error, sku ETH-250 appears more than once`.
- A request that uses the Python names (`customer_email`) instead of the camelCase ones: accepted,
  because validation by name is switched on.
- `not json` as the body: one `FieldError` for `body`, starting `Invalid JSON`.
- `price_order` with a naive `created_at` such as `datetime(2026, 9, 29)`: a `ValidationError`
  saying the input should have timezone info. With the SKU `GRD-HND`: `ValueError: unknown sku
  GRD-HND`.
- `OrderTotals(subtotal=Decimal("10"), discount=Decimal("1"), shipping=Decimal("0"),
  total=Decimal("10"))` is refused, and assigning to any field of a parsed request raises a
  `ValidationError` of type `frozen_instance`.
- Add `OrderRequest(customer_email=1, ...)` or `price_order(request, CATALOGUE)` to the end of the
  file and run mypy: both are reported. Delete them again.

## Stretch goals

Pick any you like once the requirements work:

- **Share the contract.** Write the JSON Schema of `OrderRequest` and `OrderResponse` to files with
  `model_json_schema(by_alias=True)`, so the TypeScript team can generate their types from yours.
- **Partial updates.** Add an `OrderUpdate` model for a `PATCH` endpoint where every field is
  optional, and a function that applies it to an `OrderResponse` with `model_copy(update=...)`,
  validating the result.
- **Status rules.** Add an `OrderStatusChanged` event, and a function that refuses impossible
  transitions (a cancelled order can't be shipped) using a `match` that ends in `assert_never`.
- **The mypy plugin.** Enable Pydantic's mypy plugin in `pyproject.toml` (`plugins =
  ["pydantic.mypy"]`) and find out what it adds, such as checking `Field` defaults and
  `model_construct` calls.
- **Tests.** Write `test_orders_api.py` with pytest: one test per rule, parametrised over good and
  bad payloads, plus a test that runs mypy through `mypy.api.run` and asserts it passes.

## How it's tested

Automated tests run on every push to your repository. They rely on this:

- `orders_api.py` is at the top of the repository, and `pydantic` is a dependency in your
  `pyproject.toml`. The tests install mypy themselves.
- They import the names in the design table, plus `CATALOGUE` and `CatalogueItem` from the starter,
  and call the functions with the signatures above. Importing the file prints nothing.
- `python orders_api.py` prints the three blocks of the sample run, separated by blank lines. The
  JSON is compared as data, so spacing doesn't matter, and the error details may come in any order
  (Pydantic decides it).
- `mypy --strict orders_api.py` passes, and the file contains no `# type: ignore`.

## How to submit

Push `orders_api.py`, `pyproject.toml` and a short `README.md` (what it is, and the two commands to
run it and type-check it) to a GitHub repository. Connect the repository on this capstone's page
and add the workflow file it gives you (`.github/workflows/pylearn.yml`): the tests then run on
every push, and the page shows the results. The review runs `mypy --strict orders_api.py`, runs
`python orders_api.py` and compares it with the sample, runs hidden tests against your models and
functions with payloads you haven't seen, and then reads your code against the criteria: shared
types doing the constraining, precise errors, consistent money, and business rules kept out of the
models.
