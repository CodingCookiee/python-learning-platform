import json
from datetime import datetime, timezone
from decimal import Decimal

from pydantic import ValidationError

from plp import hidden, raises, test
from solution import error_summary, parse_order

ORDER = {
    "order_id": "A1042",
    "placed_at": "2026-09-29T10:15:00Z",
    "currency": "EUR",
    "customer": {"email": "ada@example.com", "name": "Ada"},
    "lines": [
        {"sku": "MUG-01", "quantity": 2, "unit_price": "8.00"},
        {"sku": "BEANS-1KG", "quantity": "1", "unit_price": 24.5},
    ],
}
RAW = json.dumps(ORDER)
BAD = json.dumps({**ORDER, "currency": "JPY", "lines": [{"sku": "MUG-01", "quantity": 0, "unit_price": "8.00"}]})


@test("Parses the example and reports its problems")
def _():
    order = parse_order(RAW)
    assert order.lines[1].unit_price == Decimal("24.5")
    assert order.total == Decimal("40.50")
    assert error_summary(BAD) == [
        "currency: Input should be 'GBP', 'EUR' or 'USD'",
        "lines.0.quantity: Input should be greater than 0",
    ]
    assert error_summary('{"order_id": ') == [
        "(body): Invalid JSON: EOF while parsing a value at line 1 column 13"
    ]


@test("Converts nested data into the right types")
def _():
    order = parse_order(RAW)
    assert order.placed_at == datetime(2026, 9, 29, 10, 15, tzinfo=timezone.utc)
    assert order.customer.name == "Ada"
    assert order.lines[1].quantity == 1
    assert type(order.total) is Decimal


@test("Refuses bad bodies with ValidationError")
def _():
    with raises(ValidationError):
        parse_order(BAD)
    with raises(ValidationError, match="lines"):
        parse_order(json.dumps({**ORDER, "lines": []}))
    with raises(ValidationError, match="unit_price"):
        parse_order(json.dumps({**ORDER, "lines": [{"sku": "MUG-01", "quantity": 1, "unit_price": "8.001"}]}))


@test("A valid body has no problems, and missing fields are named")
def _():
    assert error_summary(RAW) == []
    body = {key: value for key, value in ORDER.items() if key != "customer"}
    assert error_summary(json.dumps(body)) == ["customer: Field required"]


@hidden("Reports problems deep inside nested models, and a body that isn't an object")
def _():
    nested = {**ORDER, "customer": {"email": "ada@example.com"}}
    assert error_summary(json.dumps(nested)) == ["customer.name: Field required"]
    assert error_summary("[]") == ["(body): Input should be an object"]
