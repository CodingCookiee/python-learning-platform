"""Request, response and webhook models for Millstone Coffee's order API.

Run it with:  uv run python orders_api.py
Type-check:   uv run mypy --strict orders_api.py
"""

import re
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
type Sku = Annotated[str, Field(pattern=r"^[A-Z0-9]+(-[A-Z0-9]+)*$")]
type Quantity = Annotated[int, Field(gt=0, le=100)]
type Money = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]
type CountryCode = Annotated[str, Field(pattern=r"^[A-Z]{2}$")]

CENT = Decimal("0.01")
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


class ApiModel(BaseModel):
    """The base of every model: camelCase on the wire, snake_case in Python,
    unknown keys refused, strings stripped, and immutable once created."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        validate_by_alias=True,
        validate_by_name=True,
        serialize_by_alias=True,
        extra="forbid",
        str_strip_whitespace=True,
        frozen=True,
    )


# Requests


class Address(ApiModel):
    """name, line1, optional line2, city, postcode and country."""

    name: str = Field(min_length=1, max_length=100)
    line1: str = Field(min_length=1, max_length=100)
    line2: str | None = None
    city: str = Field(min_length=1, max_length=60)
    postcode: str = Field(min_length=2, max_length=10)
    country: CountryCode


class LineItemIn(ApiModel):
    """One line of an order request: a SKU and a quantity."""

    sku: Sku
    quantity: Quantity


class OrderRequest(ApiModel):
    """What the storefront posts to create an order."""

    customer_email: str
    currency: Currency
    lines: list[LineItemIn] = Field(min_length=1, max_length=50)
    shipping_address: Address
    billing_address: Address | None = None
    coupon_code: str | None = None

    @field_validator("customer_email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        value = value.lower()
        if not EMAIL.fullmatch(value):
            raise ValueError("not an email address")
        return value

    @field_validator("coupon_code")
    @classmethod
    def normalise_coupon(cls, value: str | None) -> str | None:
        return value.upper() if value else None

    @model_validator(mode="after")
    def skus_are_unique(self) -> Self:
        seen: set[str] = set()
        for line in self.lines:
            if line.sku in seen:
                raise ValueError(f"sku {line.sku} appears more than once")
            seen.add(line.sku)
        return self


# Responses


class LineItemOut(ApiModel):
    """One priced line of an order."""

    sku: Sku
    name: str
    quantity: Quantity
    unit_price: Money
    line_total: Money


class OrderTotals(ApiModel):
    """subtotal, discount, shipping and total, which must add up."""

    subtotal: Money
    discount: Money
    shipping: Money
    total: Money

    @model_validator(mode="after")
    def adds_up(self) -> Self:
        if self.discount > self.subtotal:
            raise ValueError("the discount is larger than the subtotal")
        if self.total != self.subtotal - self.discount + self.shipping:
            raise ValueError("the total isn't subtotal - discount + shipping")
        return self


class OrderResponse(ApiModel):
    """What the API returns for a created order."""

    order_id: Annotated[str, Field(pattern=r"^ord_[a-z0-9]{8}$")]
    status: OrderStatus
    created_at: AwareDatetime
    currency: Currency
    customer_email: str
    lines: list[LineItemOut] = Field(min_length=1)
    shipping_address: Address
    billing_address: Address
    coupon_code: str | None
    totals: OrderTotals

    @model_validator(mode="after")
    def subtotal_is_the_sum_of_the_lines(self) -> Self:
        if self.totals.subtotal != sum((line.line_total for line in self.lines), Decimal("0")):
            raise ValueError("the subtotal isn't the sum of the line totals")
        return self


class FieldError(ApiModel):
    """One problem with a request: where it is and what's wrong."""

    field: str
    message: str


class ErrorResponse(ApiModel):
    """What the API returns for a request that fails validation."""

    error: Literal["invalid_request"] = "invalid_request"
    details: list[FieldError]


# Webhook events


class PaymentCaptured(ApiModel):
    type: Literal["payment.captured"]
    order_id: str
    amount: Money
    captured_at: AwareDatetime


class OrderShipped(ApiModel):
    type: Literal["order.shipped"]
    order_id: str
    carrier: str
    tracking_number: str


class OrderCancelled(ApiModel):
    type: Literal["order.cancelled"]
    order_id: str
    reason: str = Field(min_length=1)


type OrderEvent = Annotated[PaymentCaptured | OrderShipped | OrderCancelled, Field(discriminator="type")]

EVENTS: TypeAdapter[OrderEvent] = TypeAdapter(OrderEvent)


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
    return OrderRequest.model_validate_json(raw)


def price_order(
    request: OrderRequest,
    catalogue: Mapping[str, CatalogueItem],
    *,
    order_id: str,
    created_at: datetime,
) -> OrderResponse:
    """Price a valid request against the catalogue and build the response."""
    lines = []
    for line in request.lines:
        item = catalogue.get(line.sku)
        if item is None:
            raise ValueError(f"unknown sku {line.sku}")
        unit_price = item.prices[request.currency]
        lines.append(
            LineItemOut(
                sku=line.sku,
                name=item.name,
                quantity=line.quantity,
                unit_price=unit_price,
                line_total=unit_price * line.quantity,
            )
        )
    subtotal = sum((line.line_total for line in lines), Decimal("0"))
    coupon = request.coupon_code if request.coupon_code in COUPONS else None
    discount = Decimal("0.00")
    if coupon is not None:
        discount = (subtotal * COUPONS[coupon]).quantize(CENT, rounding=ROUND_HALF_UP)
    if subtotal - discount >= FREE_SHIPPING_FROM[request.currency]:
        shipping = Decimal("0.00")
    else:
        shipping = SHIPPING[request.currency]
    return OrderResponse(
        order_id=order_id,
        status="pending",
        created_at=created_at,
        currency=request.currency,
        customer_email=request.customer_email,
        lines=lines,
        shipping_address=request.shipping_address,
        billing_address=request.billing_address or request.shipping_address,
        coupon_code=coupon,
        totals=OrderTotals(
            subtotal=subtotal,
            discount=discount,
            shipping=shipping,
            total=subtotal - discount + shipping,
        ),
    )


def error_response(error: ValidationError) -> ErrorResponse:
    """One FieldError per problem in a ValidationError."""
    return ErrorResponse(
        details=[
            FieldError(
                field=".".join(str(part) for part in problem["loc"]) or "body",
                message=problem["msg"],
            )
            for problem in error.errors()
        ]
    )


def parse_event(raw: str | bytes) -> OrderEvent:
    """Parse one webhook event, choosing its model by its type field."""
    return EVENTS.validate_json(raw)


def describe_event(event: OrderEvent) -> str:
    """One line saying what happened."""
    match event:
        case PaymentCaptured():
            return f"{event.order_id}: payment of {event.amount} captured"
        case OrderShipped():
            return f"{event.order_id}: shipped with {event.carrier}, tracking {event.tracking_number}"
        case OrderCancelled():
            return f"{event.order_id}: cancelled ({event.reason})"


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
