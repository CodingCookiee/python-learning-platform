from plp import test, hidden
from solution import mask_card


@test("Masks a card number written with dashes")
def _():
    assert mask_card("4111-1111-1111-1234") == "************1234"


@test("Masks a card number written with spaces")
def _():
    assert mask_card("4242 4242 4242 4242") == "************4242"


@test("Masks a number with no separators")
def _():
    assert mask_card("5555555555554444") == "************4444"


@hidden("Masks a 15-digit card")
def _():
    assert mask_card("3782 822463 10005") == "***********0005"


@hidden("Masks a card with dashes and spaces mixed")
def _():
    assert mask_card("6011 - 0009 - 9013 - 9424") == "************9424"
