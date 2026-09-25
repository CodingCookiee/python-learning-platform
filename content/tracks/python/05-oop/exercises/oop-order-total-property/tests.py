from plp import test, hidden
from solution import Order


@test("Totals the order and counts the items")
def _():
    order = Order([("Coffee beans", 2, 12.5), ("Mug", 1, 8.0)])
    assert order.total == 33.0
    assert order.item_count == 3


@test("Stays right after a line is added")
def _():
    order = Order([("Coffee beans", 2, 12.5), ("Mug", 1, 8.0)])
    order.lines.append(("Filter papers", 3, 2.0))
    assert order.total == 39.0
    assert order.item_count == 6


@test("total and item_count are properties")
def _():
    assert isinstance(vars(Order).get("total"), property), "total should be a @property"
    assert isinstance(vars(Order).get("item_count"), property), "item_count should be a @property"


@hidden("An empty order totals zero")
def _():
    order = Order([])
    assert order.total == 0
    assert order.item_count == 0


@hidden("The total can't be assigned")
def _():
    order = Order([("Mug", 1, 8.0)])
    try:
        order.total = 0
    except AttributeError:
        return
    raise AssertionError("order.total = 0 should raise AttributeError: it's computed, not stored")
