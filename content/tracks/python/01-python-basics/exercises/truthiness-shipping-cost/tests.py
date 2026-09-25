from plp import test, hidden
from solution import shipping_cost


@test("Prices a light parcel")
def _():
    assert shipping_cost(0.5) == 3.5


@test("Includes each band's upper limit")
def _():
    assert shipping_cost(1) == 3.5
    assert shipping_cost(5) == 7.0
    assert shipping_cost(20) == 15.0


@test("Refuses a parcel over 20 kg")
def _():
    assert shipping_cost(25) is None


@hidden("Moves up a band just past each limit")
def _():
    assert shipping_cost(1.01) == 7.0
    assert shipping_cost(5.01) == 15.0


@hidden("Refuses a weight of zero or less")
def _():
    assert shipping_cost(0) is None
    assert shipping_cost(-2) is None


@hidden("Refuses a parcel just over the limit")
def _():
    assert shipping_cost(20.01) is None
