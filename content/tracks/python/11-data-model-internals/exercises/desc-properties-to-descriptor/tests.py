from plp import test, hidden, raises, source_avoids
import solution
from solution import Shipment


def sample():
    return Shipment("SHP-1", weight_kg=2.5, length_cm=40, declared_value=120)


@test("Behaves exactly as before")
def _():
    parcel = sample()
    parcel.weight_kg = 3
    assert parcel.weight_kg == 3
    raises(ValueError, setattr, parcel, "length_cm", 0, match=r"^length_cm must be a positive number, got 0$")


@test("One PositiveNumber descriptor per field, and no properties")
def _():
    PositiveNumber = getattr(solution, "PositiveNumber", None)
    assert PositiveNumber is not None, "Define a descriptor class called PositiveNumber"
    for field in ("weight_kg", "length_cm", "declared_value"):
        assert isinstance(vars(Shipment)[field], PositiveNumber), f"Shipment.{field} should be a PositiveNumber()"
    assert hasattr(PositiveNumber, "__set_name__")
    assert isinstance(Shipment.weight_kg, PositiveNumber), "Read on the class, a field should give the descriptor"
    assert source_avoids(name="property"), "Replace every property with the descriptor"


@test("Refuses bad values at creation too, naming the field")
def _():
    raises(ValueError, Shipment, "SHP-2", -1, 40, 120, match=r"^weight_kg must be a positive number, got -1$")
    raises(ValueError, Shipment, "SHP-2", 1, 40, "120", match=r"declared_value .* got '120'$")
    raises(ValueError, Shipment, "SHP-2", 1, True, 120, match=r"length_cm .* got True$")


@hidden("Each shipment keeps its own values")
def _():
    first = sample()
    second = Shipment("SHP-2", weight_kg=9, length_cm=80, declared_value=15.5)
    first.declared_value = 99
    assert (first.weight_kg, first.length_cm, first.declared_value) == (2.5, 40, 99)
    assert (second.weight_kg, second.length_cm, second.declared_value) == (9, 80, 15.5)


@hidden("A refused value leaves the old one in place")
def _():
    parcel = sample()
    raises(ValueError, setattr, parcel, "weight_kg", -0.5)
    raises(ValueError, setattr, parcel, "declared_value", None)
    assert parcel.weight_kg == 2.5
    assert parcel.declared_value == 120
    assert parcel.reference == "SHP-1"
