"""Acceptance tests for the typed API models, run by GitHub Actions in your repository.

They import orders_api.py from the top of your repository, send it payloads like the
storefront and the payment provider would, and run mypy --strict on it.
"""

import importlib
import json
import subprocess
import sys
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

import pytest
from pydantic import ValidationError

PROGRAM = Path("orders_api.py")
WHEN = datetime(2026, 9, 29, 10, 15, tzinfo=UTC)

ADDRESS = {
    "name": "Ada Lovelace",
    "line1": "12 St James's Square",
    "city": "London",
    "postcode": "SW1Y 4JH",
    "country": "GB",
}
ADDRESS_OUT = {**ADDRESS, "line2": None}

SAMPLE_RESPONSE = {
    "orderId": "ord_7f3k2m9q",
    "status": "pending",
    "createdAt": "2026-09-29T10:15:00Z",
    "currency": "GBP",
    "customerEmail": "ada@example.com",
    "lines": [
        {"sku": "ETH-250", "name": "Ethiopia Yirgacheffe, 250 g", "quantity": 2, "unitPrice": "9.50", "lineTotal": "19.00"},
        {"sku": "MUG-STN", "name": "Stoneware mug", "quantity": 1, "unitPrice": "14.00", "lineTotal": "14.00"},
    ],
    "shippingAddress": ADDRESS_OUT,
    "billingAddress": ADDRESS_OUT,
    "couponCode": "WELCOME10",
    "totals": {"subtotal": "33.00", "discount": "3.30", "shipping": "4.95", "total": "34.65"},
}

SAMPLE_ERRORS = {
    "error": "invalid_request",
    "details": [
        {"field": "customerEmail", "message": "Value error, not an email address"},
        {"field": "currency", "message": "Input should be 'GBP', 'EUR' or 'USD'"},
        {"field": "lines.0.quantity", "message": "Input should be greater than 0"},
        {"field": "lines.1.sku", "message": "String should match pattern '^[A-Z0-9]+(-[A-Z0-9]+)*$'"},
        {"field": "shippingAddress.postcode", "message": "Field required"},
        {"field": "shippingAddress.country", "message": "String should match pattern '^[A-Z]{2}$'"},
        {"field": "giftWrap", "message": "Extra inputs are not permitted"},
    ],
}

SAMPLE_EVENT_LINES = [
    "ord_7f3k2m9q: payment of 34.65 captured",
    "ord_7f3k2m9q: shipped with Royal Mail, tracking RA123456785GB",
    "ord_2b8d4c1x: cancelled (Customer changed their mind)",
    "Refused: Input tag 'order.refunded' found using 'type' does not match any of the expected tags: "
    "'payment.captured', 'order.shipped', 'order.cancelled'",
]


@pytest.fixture(scope="module")
def api():
    assert PROGRAM.exists(), "orders_api.py should be at the top of your repository"
    return importlib.import_module("orders_api")


def request(**changes):
    """The sample order request as JSON, with some keys changed (None removes a key)."""
    body = {
        "customerEmail": "Ada@Example.com",
        "currency": "GBP",
        "lines": [{"sku": "ETH-250", "quantity": 2}, {"sku": "MUG-STN", "quantity": 1}],
        "shippingAddress": ADDRESS,
        "couponCode": "welcome10",
    }
    body.update(changes)
    return json.dumps({key: value for key, value in body.items() if value is not None})


def by_field(details):
    """Error details in a fixed order: Pydantic decides the order they're reported in."""
    return sorted(details, key=lambda detail: (detail["field"], detail["message"]))


def priced(api, raw, **options):
    """The JSON response for a raw request, as a dict."""
    response = api.price_order(
        api.parse_order_request(raw), api.CATALOGUE, order_id="ord_7f3k2m9q", created_at=WHEN, **options
    )
    return json.loads(response.model_dump_json())


def errors_for(api, raw):
    """The error response for a request that must fail, as a dict."""
    with pytest.raises(ValidationError) as caught:
        api.parse_order_request(raw)
    return json.loads(api.error_response(caught.value).model_dump_json())


def test_running_it_prints_the_sample_run():
    assert PROGRAM.exists(), "orders_api.py should be at the top of your repository"
    result = subprocess.run([sys.executable, str(PROGRAM)], capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, f"python orders_api.py crashed:\n{result.stderr[-1500:]}"
    blocks = result.stdout.strip().split("\n\n")
    assert len(blocks) == 3, "Expected three blocks separated by blank lines: the order, the errors, the events"
    assert json.loads(blocks[0]) == SAMPLE_RESPONSE, "The first block isn't the order response from the brief"
    errors = json.loads(blocks[1])
    assert errors.keys() == SAMPLE_ERRORS.keys() and errors["error"] == "invalid_request"
    assert by_field(errors["details"]) == by_field(SAMPLE_ERRORS["details"]), (
        "The second block doesn't list the seven problems from the brief"
    )
    assert [line.rstrip() for line in blocks[2].splitlines()] == SAMPLE_EVENT_LINES


def test_importing_it_prints_nothing():
    assert PROGRAM.exists(), "orders_api.py should be at the top of your repository"
    result = subprocess.run([sys.executable, "-c", "import orders_api"], capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, f"Importing orders_api.py failed:\n{result.stderr[-1500:]}"
    assert result.stdout == "", 'Importing orders_api.py printed something: keep main() under if __name__ == "__main__":'


def test_coupons_and_free_shipping_are_priced_as_the_brief_says(api):
    four_bags = priced(api, request(lines=[{"sku": "ETH-250", "quantity": 4}, {"sku": "MUG-STN", "quantity": 1}]))
    assert four_bags["totals"] == {"subtotal": "52.00", "discount": "5.20", "shipping": "0.00", "total": "46.80"}, (
        "With WELCOME10, 46.80 after the discount is over 40.00, so shipping should be free"
    )
    euros = priced(api, request(currency="EUR", couponCode=None))
    assert euros["totals"] == {"subtotal": "38.50", "discount": "0.00", "shipping": "5.95", "total": "44.45"}
    assert euros["couponCode"] is None
    unknown = priced(api, request(couponCode="FREESTUFF"))
    assert unknown["totals"]["discount"] == "0.00" and unknown["totals"]["total"] == "37.95"
    assert unknown["couponCode"] is None, "An unknown coupon is ignored, and couponCode is then null"
    beans = priced(api, request(couponCode=" beans20 ", currency="USD"))
    assert beans["couponCode"] == "BEANS20"
    assert beans["totals"] == {"subtotal": "42.00", "discount": "8.40", "shipping": "6.95", "total": "40.55"}


def test_the_request_is_normalised(api):
    order = api.parse_order_request(request(customerEmail="  Ada@Example.COM ", couponCode="  "))
    assert order.customer_email == "ada@example.com", "The email should be stripped and lowercased"
    assert order.coupon_code is None, "An empty coupon code should become None"
    assert order.billing_address is None
    response = priced(api, request(billingAddress={**ADDRESS, "name": "Accounts", "line2": "Floor 2"}))
    assert response["billingAddress"]["name"] == "Accounts", "A billing address that was given should be kept"
    assert response["shippingAddress"]["name"] == "Ada Lovelace"


def test_python_field_names_are_accepted_too(api):
    raw = json.dumps({
        "customer_email": "ada@example.com",
        "currency": "GBP",
        "lines": [{"sku": "ETH-250", "quantity": 1}],
        "shipping_address": ADDRESS,
    })
    order = api.parse_order_request(raw)
    assert order.customer_email == "ada@example.com" and order.currency == "GBP"


def test_each_rule_is_reported_at_its_camelcase_path(api):
    assert by_field(errors_for(api, request(currency="JPY", customerEmail="ada@example"))["details"]) == [
        {"field": "currency", "message": "Input should be 'GBP', 'EUR' or 'USD'"},
        {"field": "customerEmail", "message": "Value error, not an email address"},
    ]
    too_many = errors_for(api, request(lines=[{"sku": "ETH-250", "quantity": 101}]))["details"]
    assert [d["field"] for d in too_many] == ["lines.0.quantity"], "A quantity over 100 should be refused"
    for sku in ("ETH--250", "-ETH", "ETH 250", "eth-250"):
        problems = errors_for(api, request(lines=[{"sku": sku, "quantity": 1}]))["details"]
        assert [d["field"] for d in problems] == ["lines.0.sku"], f"The SKU {sku!r} should be refused"
    empty = errors_for(api, request(lines=[]))["details"]
    assert [d["field"] for d in empty] == ["lines"], "An order with no lines should be refused"
    country = errors_for(api, request(shippingAddress={**ADDRESS, "country": "gb"}))["details"]
    assert [d["field"] for d in country] == ["shippingAddress.country"]
    extra = errors_for(api, request(shippingAddress={**ADDRESS, "flat": "2"}))["details"]
    assert extra == [{"field": "shippingAddress.flat", "message": "Extra inputs are not permitted"}]


def test_duplicate_skus_and_invalid_json_are_reported_against_the_body(api):
    duplicate = errors_for(api, request(lines=[{"sku": "ETH-250", "quantity": 1}, {"sku": "ETH-250", "quantity": 2}]))
    assert duplicate == {
        "error": "invalid_request",
        "details": [{"field": "body", "message": "Value error, sku ETH-250 appears more than once"}],
    }
    broken = errors_for(api, "not json")["details"]
    assert len(broken) == 1 and broken[0]["field"] == "body" and broken[0]["message"].startswith("Invalid JSON")


def test_price_order_refuses_unknown_skus_and_naive_datetimes(api):
    with pytest.raises(ValueError, match="^unknown sku GRD-HND$"):
        priced(api, request(lines=[{"sku": "GRD-HND", "quantity": 1}]))
    order = api.parse_order_request(request())
    with pytest.raises(ValidationError, match="timezone"):
        api.price_order(order, api.CATALOGUE, order_id="ord_7f3k2m9q", created_at=datetime(2026, 9, 29))
    with pytest.raises(ValidationError):
        api.price_order(order, api.CATALOGUE, order_id="order-1", created_at=WHEN)
    cheap = {"ETH-250": api.CatalogueItem(name="Test beans", prices={"GBP": Decimal("1.00"), "EUR": Decimal("1"), "USD": Decimal("1")})}
    small = api.price_order(api.parse_order_request(request(lines=[{"sku": "ETH-250", "quantity": 3}])), cheap, order_id="ord_abc12345", created_at=WHEN)
    assert small.totals.subtotal == Decimal("3.00") and small.lines[0].name == "Test beans", (
        "price_order should use the catalogue it's given, not the module's CATALOGUE"
    )


def test_response_models_refuse_totals_that_dont_add_up(api):
    with pytest.raises(ValidationError):
        api.OrderTotals(subtotal=Decimal("10"), discount=Decimal("1"), shipping=Decimal("0"), total=Decimal("10"))
    with pytest.raises(ValidationError):
        api.OrderTotals(subtotal=Decimal("10"), discount=Decimal("11"), shipping=Decimal("1"), total=Decimal("0"))
    assert api.OrderTotals(subtotal=Decimal("10"), discount=Decimal("1"), shipping=Decimal("0"), total=Decimal("9")).total == Decimal("9")
    good = api.price_order(api.parse_order_request(request()), api.CATALOGUE, order_id="ord_7f3k2m9q", created_at=WHEN)
    data = good.model_dump()
    data["totals"] = {"subtotal": Decimal("30.00"), "discount": Decimal("0"), "shipping": Decimal("0"), "total": Decimal("30.00")}
    with pytest.raises(ValidationError):
        api.OrderResponse(**data)  # the subtotal isn't the sum of the line totals


def test_models_are_frozen(api):
    order = api.parse_order_request(request())
    with pytest.raises(ValidationError) as caught:
        order.currency = "EUR"
    assert caught.value.errors()[0]["type"] == "frozen_instance"
    with pytest.raises(ValidationError):
        order.shipping_address.city = "Paris"


def test_webhook_events_are_parsed_by_type_and_described(api):
    captured = api.parse_event('{"type": "payment.captured", "orderId": "ord_1", "amount": "12.30", "capturedAt": "2026-09-29T10:16:05Z"}')
    assert isinstance(captured, api.PaymentCaptured) and captured.amount == Decimal("12.30")
    assert api.describe_event(captured) == "ord_1: payment of 12.30 captured"
    shipped = api.parse_event(b'{"type": "order.shipped", "orderId": "ord_2", "carrier": "DPD", "trackingNumber": "X1"}')
    assert isinstance(shipped, api.OrderShipped)
    assert api.describe_event(shipped) == "ord_2: shipped with DPD, tracking X1"
    cancelled = api.parse_event('{"type": "order.cancelled", "orderId": "ord_3", "reason": "Too slow"}')
    assert api.describe_event(cancelled) == "ord_3: cancelled (Too slow)"
    for bad in (
        '{"type": "order.refunded", "orderId": "ord_3"}',
        '{"type": "order.cancelled", "orderId": "ord_3", "reason": ""}',
        '{"type": "payment.captured", "orderId": "ord_1", "amount": "12.30", "capturedAt": "2026-09-29T10:16:05"}',
    ):
        with pytest.raises(ValidationError):
            api.parse_event(bad)


def test_mypy_strict_passes_with_no_type_ignore(tmp_path):
    assert PROGRAM.exists(), "orders_api.py should be at the top of your repository"
    source = PROGRAM.read_text(encoding="utf-8")
    assert "type: ignore" not in source, "Remove the # type: ignore comments: the brief allows none"
    result = subprocess.run(
        [sys.executable, "-m", "mypy", "--strict", "--cache-dir", str(tmp_path / "cache"), str(PROGRAM)],
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert result.returncode == 0, f"mypy --strict orders_api.py found problems:\n{result.stdout[-2000:]}"
