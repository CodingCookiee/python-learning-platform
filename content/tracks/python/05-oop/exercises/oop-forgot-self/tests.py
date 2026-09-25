from plp import test, hidden
from solution import Cart


@test("Adds items and totals them")
def _():
    cart = Cart("Ada")
    cart.add("Coffee beans", 12.5)
    cart.add("Mug", 8.0)
    assert cart.items == [("Coffee beans", 12.5), ("Mug", 8.0)]
    assert cart.total() == 20.5


@test("Remembers the owner")
def _():
    assert Cart("Ada").owner == "Ada"


@test("A new cart is empty and totals zero")
def _():
    cart = Cart("Grace")
    assert cart.items == []
    assert cart.total() == 0


@hidden("Two carts don't share items")
def _():
    ada = Cart("Ada")
    grace = Cart("Grace")
    ada.add("Mug", 8.0)
    assert grace.items == [], "Adding to one cart changed another"
    assert ada.items is not grace.items
