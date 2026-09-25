from plp import test, hidden
from solution import describe


@test("Describes an int")
def _():
    assert describe(42) == "42 is a int"


@test("Keeps quotes on a str")
def _():
    assert describe("42") == "'42' is a str"


@test("Describes a list")
def _():
    assert describe([1, 2]) == "[1, 2] is a list"


@hidden("Describes a float and a bool")
def _():
    assert describe(0.5) == "0.5 is a float"
    assert describe(True) == "True is a bool"


@hidden("Describes None")
def _():
    assert describe(None) == "None is a NoneType"
