from plp import test, hidden
from solution import Shipment


@test("Builds the label for a parcel")
def _():
    parcel = Shipment("RA123456785GB", 2.5)
    assert parcel.label() == "RA123456785GB (2.5 kg)"


@test("Stores the tracking code and the weight")
def _():
    parcel = Shipment("RA123456785GB", 2.5)
    assert parcel.tracking == "RA123456785GB"
    assert parcel.weight_kg == 2.5


@test("Each shipment keeps its own data")
def _():
    parcel = Shipment("RA123456785GB", 2.5)
    letter = Shipment("RB987654321GB", 0.1)
    assert parcel.label() == "RA123456785GB (2.5 kg)"
    assert letter.label() == "RB987654321GB (0.1 kg)"


@hidden("The label follows a changed weight")
def _():
    parcel = Shipment("RC111222333GB", 1)
    parcel.weight_kg = 4
    assert parcel.label() == "RC111222333GB (4 kg)"
