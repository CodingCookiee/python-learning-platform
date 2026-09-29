"""Request, response and webhook models for Millstone Coffee's order API.

Run it with:  uv run python orders_api.py
Type-check:   uv run mypy --strict orders_api.py
"""

from collections.abc import Mapping
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated, Literal, Self

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    TypeAdapter,
    ValidationError,
    field_validator,
    model_validator,
)
from pydantic.alias_generators import to_camel

# Shared types: every model uses these, so each rule is written once

type Currency = Literal["GBP", "EUR", "USD"]
type OrderStatus = Literal["pending", "paid", "shipped", "cancelled"]
# Sku: uppercase letters and digits in groups joined by single hyphens, such as ETH-250
# Quantity: a whole number from 1 to 100
# Money: a Decimal of 0 or more, at most 10 digits with 2 decimal places
# CountryCode: two uppercase letters, such as GB

CENT = Decimal("0.01")


class ApiModel(BaseModel):
    """The base of every model: camelCase on the wire, snake_case in Python,
    unknown keys refused, strings stripped, and immutable once created."""


# Requests


class Address(ApiModel):
    """name, line1, optional line2, city, postcode and country."""


class LineItemIn(ApiModel):
    """One line of an order request: a SKU and a quantity."""


class OrderRequest(ApiModel):
    """What the storefront posts to create an order."""


# Responses


class LineItemOut(ApiModel):
    """One priced line of an order."""


class OrderTotals(ApiModel):
    """subtotal, discount, shipping and total, which must add up."""


class OrderResponse(ApiModel):
    """What the API returns for a created order."""


class FieldError(ApiModel):
    """One problem with a request: where it is and what's wrong."""


class ErrorResponse(ApiModel):
    """What the API returns for a request that fails validation."""


# Webhook events: PaymentCaptured, OrderShipped and OrderCancelled, then the OrderEvent union


# The catalogue and pricing rules. Don't change these.


class CatalogueItem(BaseModel):
    name: str
    prices: dict[Currency, Decimal]


CATALOGUE: dict[str, CatalogueItem] = {
    "ETH-250": CatalogueItem(
        name="Ethiopia Yirgacheffe, 250 g",
        prices={"GBP": Decimal("9.50"), "EUR": Decimal("11.00"), "USD": Decimal("12.00")},
    ),
    "DEC-250": CatalogueItem(
        name="Swiss Water decaf, 250 g",
        prices={"GBP": Decimal("8.75"), "EUR": Decimal("10.25"), "USD": Decimal("11.00")},
    ),
    "MUG-STN": CatalogueItem(
        name="Stoneware mug",
        prices={"GBP": Decimal("14.00"), "EUR": Decimal("16.50"), "USD": Decimal("18.00")},
    ),
    "V60-100": CatalogueItem(
        name="V60 paper filters, pack of 100",
        prices={"GBP": Decimal("5.25"), "EUR": Decimal("6.00"), "USD": Decimal("6.50")},
    ),
}
SHIPPING: dict[Currency, Decimal] = {"GBP": Decimal("4.95"), "EUR": Decimal("5.95"), "USD": Decimal("6.95")}
FREE_SHIPPING_FROM: dict[Currency, Decimal] = {
    "GBP": Decimal("40.00"),
    "EUR": Decimal("45.00"),
    "USD": Decimal("50.00"),
}
COUPONS: dict[str, Decimal] = {"WELCOME10": Decimal("0.10"), "BEANS20": Decimal("0.20")}


# Functions


def parse_order_request(raw: str | bytes) -> OrderRequest:
    """Parse and validate an order request's JSON body."""
    ...


def price_order(
    request: OrderRequest,
    catalogue: Mapping[str, CatalogueItem],
    *,
    order_id: str,
    created_at: datetime,
) -> OrderResponse:
    """Price a valid request against the catalogue and build the response."""
    ...


def error_response(error: ValidationError) -> ErrorResponse:
    """One FieldError per problem in a ValidationError."""
    ...


# parse_event(raw) and describe_event(event)


# Sample data. main() uses it to print everything shown in the brief.

SAMPLE_REQUEST = """
{
  "customerEmail": "Ada@Example.com",
  "currency": "GBP",
  "lines": [
    {"sku": "ETH-250", "quantity": 2},
    {"sku": "MUG-STN", "quantity": 1}
  ],
  "shippingAddress": {
    "name": "Ada Lovelace",
    "line1": "12 St James's Square",
    "city": "London",
    "postcode": "SW1Y 4JH",
    "country": "GB"
  },
  "couponCode": "welcome10"
}
"""

BAD_REQUEST = """
{
  "customerEmail": "ada@example",
  "currency": "JPY",
  "lines": [
    {"sku": "ETH-250", "quantity": 0},
    {"sku": "eth-250", "quantity": 1}
  ],
  "shippingAddress": {"name": "Ada Lovelace", "line1": "12 St James's Square", "city": "London", "country": "United Kingdom"},
  "giftWrap": true
}
"""

SAMPLE_EVENTS = [
    '{"type": "payment.captured", "orderId": "ord_7f3k2m9q", "amount": "34.65", "capturedAt": "2026-09-29T10:16:05Z"}',
    '{"type": "order.shipped", "orderId": "ord_7f3k2m9q", "carrier": "Royal Mail", "trackingNumber": "RA123456785GB"}',
    '{"type": "order.cancelled", "orderId": "ord_2b8d4c1x", "reason": "Customer changed their mind"}',
    '{"type": "order.refunded", "orderId": "ord_2b8d4c1x"}',
]


def main() -> None:
    request = parse_order_request(SAMPLE_REQUEST)
    response = price_order(
        request,
        CATALOGUE,
        order_id="ord_7f3k2m9q",
        created_at=datetime(2026, 9, 29, 10, 15, tzinfo=UTC),
    )
    print(response.model_dump_json(indent=2))
    print()
    try:
        parse_order_request(BAD_REQUEST)
    except ValidationError as error:
        print(error_response(error).model_dump_json(indent=2))
    print()
    for raw in SAMPLE_EVENTS:
        try:
            print(describe_event(parse_event(raw)))
        except ValidationError as error:
            print("Refused:", error.errors()[0]["msg"])


if __name__ == "__main__":
    main()
