import re

from plp import test, hidden
from solution import Cart


@test("Each cart has its own items and its own id")
def _():
    first = Cart("Ada")
    second = Cart("Grace")
    first.add("MUG-01", 2)
    assert (first.items, second.items) == ({"MUG-01": 2}, {})
    assert first.cart_id != second.cart_id


@test("Ids look like CART-0001")
def _():
    cart_id = Cart("Ada").cart_id
    assert re.fullmatch(r"CART-\d{4}", cart_id), f"{cart_id!r} doesn't look like CART-0001"


@test("add() adds up repeated SKUs")
def _():
    cart = Cart("Ada")
    cart.add("MUG-01")
    cart.add("MUG-01", 2)
    cart.add("LAMP-02")
    assert cart.items == {"MUG-01": 3, "LAMP-02": 1}


@hidden("Many carts, all different ids and all empty")
def _():
    carts = [Cart("Shopper") for _ in range(5)]
    assert len({cart.cart_id for cart in carts}) == 5
    assert all(cart.items == {} for cart in carts)
    assert len({id(cart.items) for cart in carts}) == 5


@hidden("Items and ids can still be passed in")
def _():
    cart = Cart("Ada", {"MUG-01": 1}, "CART-9999")
    assert (cart.items, cart.cart_id) == ({"MUG-01": 1}, "CART-9999")
