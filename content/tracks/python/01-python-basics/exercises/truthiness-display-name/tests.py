from plp import test, hidden
from solution import display_name


@test("Returns the name when there is one")
def _():
    assert display_name("Ada") == "Ada"


@test("Uses Guest for an empty name")
def _():
    assert display_name("") == "Guest"


@test("Uses Guest for None")
def _():
    assert display_name(None) == "Guest"


@hidden("Leaves a full name unchanged")
def _():
    assert display_name("Grace Hopper") == "Grace Hopper"
