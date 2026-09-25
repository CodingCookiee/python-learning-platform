from plp import test, hidden, source_avoids
import solution


@test("Discounts one price and a whole checkout")
def _():
    assert solution.discounted(80, 25) == 60.0
    assert solution.checkout_total([19.99, 5.0, 12.5], 10) == 33.74


@test("No classes remain")
def _():
    assert source_avoids(node="ClassDef"), "Replace the class with a function"


@test("Zero percent changes nothing")
def _():
    assert solution.discounted(19.99, 0) == 19.99
    assert solution.checkout_total([], 50) == 0


@hidden("A full discount makes it free, and rounding is to cents")
def _():
    assert solution.discounted(42.0, 100) == 0
    assert solution.discounted(9.99, 33) == 6.69
