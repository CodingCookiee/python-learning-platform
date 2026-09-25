import contextlib
import io

from plp import test, hidden
from solution import order_total, shipping_cost


@test("order_total adds shipping to the subtotal")
def _():
    assert order_total(20, 1.5) == 24.99


@test("shipping_cost returns the flat rate up to 2 kg")
def _():
    assert shipping_cost(1.5) == 4.99


@test("shipping_cost adds £1.25 per kg over 2 kg")
def _():
    assert shipping_cost(6) == 9.99


@hidden("Exactly 2 kg is still the flat rate")
def _():
    assert shipping_cost(2) == 4.99
    assert order_total(10.01, 2) == 15.0


@hidden("Prints nothing")
def _():
    screen = io.StringIO()
    with contextlib.redirect_stdout(screen):
        shipping_cost(3)
        order_total(20, 3)
    assert screen.getvalue() == "", "The functions should return their results, not print them"
