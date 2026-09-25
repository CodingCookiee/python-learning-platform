from plp import test, hidden
from solution import order_quantity


@test("Uses 1 when the box was left empty")
def _():
    assert order_quantity(None) == 1


@test("Keeps the quantity the customer chose")
def _():
    assert order_quantity(3) == 3


@test("Keeps 0, which removes the item")
def _():
    assert order_quantity(0) == 0


@hidden("Keeps a large quantity")
def _():
    assert order_quantity(250) == 250
