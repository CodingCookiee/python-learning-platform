import json
from datetime import date

from plp import test, hidden
from solution import Shipment

EXAMPLE = '{"tracking": "RA123456785GB", "weight_g": 2500, "shipped": "2026-09-20"}'


def raises_value_error(action):
    try:
        action()
    except ValueError:
        return True
    return False


@test("Reads a shipment from JSON")
def _():
    parcel = Shipment.from_json(EXAMPLE)
    assert parcel.tracking == "RA123456785GB"
    assert parcel.shipped == date(2026, 9, 20)
    assert parcel.weight_kg == 2.5
    assert parcel.days_in_transit(date(2026, 9, 25)) == 5
    assert Shipment.valid_tracking("RA12345GB") is False


@test("Writes JSON that reads back the same")
def _():
    parcel = Shipment("RB987654321GB", 120, date(2026, 1, 31))
    assert json.loads(parcel.to_json()) == {
        "tracking": "RB987654321GB",
        "weight_g": 120,
        "shipped": "2026-01-31",
    }
    again = Shipment.from_json(parcel.to_json())
    assert (again.tracking, again.weight_g, again.shipped) == ("RB987654321GB", 120, date(2026, 1, 31))


@test("Refuses a bad tracking code or weight, however the shipment is built")
def _():
    assert raises_value_error(lambda: Shipment("ra123456785gb", 100, date(2026, 9, 1))), (
        "A lowercase tracking code should raise ValueError"
    )
    assert raises_value_error(lambda: Shipment("RA123456785GB", 0, date(2026, 9, 1))), (
        "A weight of 0 should raise ValueError"
    )
    bad = '{"tracking": "XX1GB", "weight_g": 100, "shipped": "2026-09-01"}'
    assert raises_value_error(lambda: Shipment.from_json(bad)), "from_json with a bad code should raise ValueError"


@test("from_json on a subclass returns the subclass")
def _():
    class ExpressShipment(Shipment):
        pass

    assert type(ExpressShipment.from_json(EXAMPLE)) is ExpressShipment


@hidden("valid_tracking checks the whole code")
def _():
    assert Shipment.valid_tracking("RA123456785GB") is True
    assert Shipment.valid_tracking("RA123456785GBX") is False
    assert Shipment.valid_tracking("1A123456785GB") is False
    assert Shipment.valid_tracking(" RA123456785GB") is False


@hidden("weight_kg is read-only and follows the grams")
def _():
    parcel = Shipment("RC111222333GB", 750, date(2026, 9, 1))
    assert parcel.weight_kg == 0.75
    try:
        parcel.weight_kg = 1
    except AttributeError:
        return
    raise AssertionError("parcel.weight_kg = 1 should raise AttributeError")


@hidden("Counts days across a month boundary")
def _():
    parcel = Shipment("RC111222333GB", 750, date(2026, 8, 28))
    assert parcel.days_in_transit(date(2026, 9, 2)) == 5
    assert parcel.days_in_transit(date(2026, 8, 28)) == 0
