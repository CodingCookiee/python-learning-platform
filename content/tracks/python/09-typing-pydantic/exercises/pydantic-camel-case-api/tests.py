import json
from datetime import date

from pydantic import ValidationError

from plp import hidden, raises, test
from solution import ShipmentUpdate, parse_update, to_api

RAW = '{"trackingNumber": "RA123", "carrier": "DHL", "status": "delivered", "signedBy": "A. Lovelace"}'


@test("Reads camelCase JSON and writes it back")
def _():
    update = parse_update(RAW)
    assert update.signed_by == "A. Lovelace"
    assert to_api(update) == '{"trackingNumber":"RA123","carrier":"DHL","status":"delivered","signedBy":"A. Lovelace"}'


@test("Python code uses the snake_case names")
def _():
    update = ShipmentUpdate(tracking_number="RA124", carrier="Royal Mail", status="in_transit")
    assert update.tracking_number == "RA124"
    assert update.estimated_delivery is None


@test("Converts the delivery date both ways")
def _():
    update = parse_update('{"trackingNumber": "RA125", "carrier": "DPD", "status": "in_transit", "estimatedDelivery": "2026-10-02"}')
    assert update.estimated_delivery == date(2026, 10, 2)
    assert json.loads(to_api(update)) == {
        "trackingNumber": "RA125",
        "carrier": "DPD",
        "status": "in_transit",
        "estimatedDelivery": "2026-10-02",
    }


@hidden("Refuses an unknown status and a missing tracking number, and round-trips")
def _():
    with raises(ValidationError, match="status"):
        parse_update('{"trackingNumber": "RA126", "carrier": "DPD", "status": "lost"}')
    with raises(ValidationError, match="trackingNumber|tracking_number"):
        parse_update('{"carrier": "DPD", "status": "in_transit"}')
    update = parse_update(RAW)
    assert parse_update(to_api(update)) == update
