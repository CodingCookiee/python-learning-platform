from plp import test, hidden
from solution import cheapest_first

LAMP = {"name": "Desk lamp", "price": 34.0}
NOTEBOOK = {"name": "Notebook", "price": 4.5}
MUG = {"name": "Mug", "price": 9.0}


@test("Sorts products by price")
def _():
    assert cheapest_first([LAMP, NOTEBOOK, MUG]) == [NOTEBOOK, MUG, LAMP]


@test("Leaves the original list unchanged")
def _():
    products = [MUG, NOTEBOOK]
    cheapest_first(products)
    assert products == [MUG, NOTEBOOK]


@test("Keeps equal prices in their original order")
def _():
    blue = {"name": "Blue pen", "price": 1.2}
    red = {"name": "Red pen", "price": 1.2}
    assert cheapest_first([blue, MUG, red]) == [blue, red, MUG]


@hidden("An empty list gives an empty list")
def _():
    assert cheapest_first([]) == []
