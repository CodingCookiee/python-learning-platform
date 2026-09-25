from plp import test, hidden
from solution import Order


@test("Lines added to one order don't appear on another")
def _():
    first = Order("Ada")
    second = Order("Grace")
    first.add_line("Coffee beans", 2, 12.5)
    assert second.lines == []


@test("Each order totals only its own lines")
def _():
    first = Order("Ada")
    second = Order("Grace")
    first.add_line("Coffee beans", 2, 12.5)
    second.add_line("Mug", 1, 8.0)
    assert first.total() == 25.0
    assert second.total() == 8.0


@test("New orders are open, and shipping one doesn't ship the others")
def _():
    first = Order("Ada")
    second = Order("Grace")
    first.ship()
    assert (first.status, second.status) == ("shipped", "open")


@hidden("No list is shared through the class")
def _():
    first = Order("Ada")
    second = Order("Grace")
    assert first.lines is not second.lines
    assert not isinstance(vars(Order).get("lines"), list), "Order still has a lines list on the class"


@hidden("A new order starts empty even after other orders were filled")
def _():
    for _ in range(3):
        Order("Ada").add_line("Filter papers", 1, 3.0)
    assert Order("Grace").total() == 0
