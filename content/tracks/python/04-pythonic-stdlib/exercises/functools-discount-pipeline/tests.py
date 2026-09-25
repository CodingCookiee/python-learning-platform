from functools import partial

from plp import test, hidden, source_uses
from solution import apply_all

STEPS = [lambda p: p - 5, lambda p: p * 0.9, lambda p: round(p, 2)]


@test("Applies every step in order")
def _():
    assert apply_all(50, STEPS) == 40.5


@test("Returns the price unchanged when there are no steps")
def _():
    assert apply_all(19.99, []) == 19.99


@test("Uses functools.reduce")
def _():
    assert source_uses(call="reduce"), "Combine the steps with reduce(...)"


@hidden("Order matters: percentage first, then the voucher")
def _():
    steps = [lambda p: p * 0.9, lambda p: p - 5, lambda p: round(p, 2)]
    assert apply_all(50, steps) == 40.0


@hidden("Works with partial objects and built-ins as steps")
def _():
    def minus(price, amount):
        return price - amount

    assert apply_all(12.345, [partial(minus, amount=2), round]) == 10
