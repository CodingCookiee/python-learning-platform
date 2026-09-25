from dataclasses import FrozenInstanceError

from plp import test, hidden
from solution import Address, deliveries_per_address


@test("Labels, counts and refuses changes")
def _():
    home = Address("1 Mill Lane", "Leeds", "LS1 4AB")
    assert home.label() == "1 Mill Lane\nLeeds LS1 4AB\nGB"
    counts = deliveries_per_address(
        [home, Address("1 Mill Lane", "Leeds", "LS1 4AB"), home.with_postcode("LS2 9JT")]
    )
    assert counts[home] == 2
    try:
        home.city = "York"
    except FrozenInstanceError:
        return
    raise AssertionError('home.city = "York" should raise FrozenInstanceError')


@test("with_postcode returns a copy and leaves the original alone")
def _():
    home = Address("1 Mill Lane", "Leeds", "LS1 4AB")
    moved = home.with_postcode("LS2 9JT")
    assert moved == Address("1 Mill Lane", "Leeds", "LS2 9JT")
    assert home.postcode == "LS1 4AB"


@test("Equal addresses hash alike")
def _():
    assert hash(Address("1 Mill Lane", "Leeds", "LS1 4AB")) == hash(Address("1 Mill Lane", "Leeds", "LS1 4AB"))
    assert len({Address("1 Mill Lane", "Leeds", "LS1 4AB"), Address("1 Mill Lane", "Leeds", "LS1 4AB")}) == 1


@hidden("Counts every distinct address, including the country")
def _():
    dublin = Address("5 Quay St", "Dublin", "D02 X285", "IE")
    leeds = Address("5 Quay St", "Leeds", "LS1 4AB")
    counts = deliveries_per_address([dublin, leeds, dublin, dublin])
    assert dict(counts) == {dublin: 3, leeds: 1}
    assert dublin.label() == "5 Quay St\nDublin D02 X285\nIE"


@hidden("No deliveries, no counts")
def _():
    assert dict(deliveries_per_address([])) == {}
