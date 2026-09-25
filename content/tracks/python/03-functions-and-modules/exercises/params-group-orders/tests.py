from plp import test, hidden
from solution import group_by_customer


@test("Groups order ids by customer")
def _():
    orders = [("ada", 1001), ("grace", 1002), ("ada", 1003)]
    assert group_by_customer(orders) == {"ada": [1001, 1003], "grace": [1002]}


@test("Adds into a dict you pass in, and returns it")
def _():
    week = group_by_customer([("ada", 1001)])
    returned = group_by_customer([("ada", 1004), ("linus", 1005)], week)
    assert week == {"ada": [1001, 1004], "linus": [1005]}
    assert returned is week, "group_by_customer should return the dict it was given"


@test("Separate calls don't share results")
def _():
    group_by_customer([("ada", 1)])
    assert group_by_customer([("grace", 2)]) == {"grace": [2]}


@hidden("No orders gives a new, empty dict every time")
def _():
    first = group_by_customer([])
    second = group_by_customer([])
    assert first == {}
    assert first is not second, "Two calls without groups returned the same dict object"


@hidden("Keeps each customer's orders in order")
def _():
    orders = [("mo", 3), ("mo", 1), ("mo", 2)]
    assert group_by_customer(orders) == {"mo": [3, 1, 2]}


@hidden("Works when the passed-in dict starts empty")
def _():
    report = {}
    group_by_customer([("ada", 7)], report)
    assert report == {"ada": [7]}, "An empty dict passed in should receive the orders (check with `is None`)"
