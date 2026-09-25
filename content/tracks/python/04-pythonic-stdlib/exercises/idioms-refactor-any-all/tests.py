from plp import test, hidden, source_uses, source_avoids
from solution import ready_to_ship, needs_review

ORDER = {"id": "A1", "lines": [{"sku": "mug", "in_stock": True}, {"sku": "tea", "in_stock": False}]}


@test("Still gives the same answers")
def _():
    assert ready_to_ship(ORDER) is False
    assert needs_review([{"total": 40}, {"total": 1200}]) is True


@test("Uses all() and any()")
def _():
    assert source_uses(call="all"), "ready_to_ship should use all()"
    assert source_uses(call="any"), "needs_review should use any()"


@test("Has no for statements left")
def _():
    assert source_avoids(node="For"), "Replace both for loops with all() and any()"


@hidden("An order whose lines are all in stock is ready")
def _():
    order = {"id": "A2", "lines": [{"sku": "mug", "in_stock": True}]}
    assert ready_to_ship(order) is True


@hidden("Keeps the empty cases: no lines is ready, no orders needs no review")
def _():
    assert ready_to_ship({"id": "A3", "lines": []}) is True
    assert needs_review([]) is False


@hidden("A total of exactly 1000 doesn't need review")
def _():
    assert needs_review([{"total": 1000}]) is False
