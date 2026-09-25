from plp import test, hidden
from solution import latest_three


@test("Returns the last three orders, newest first")
def _():
    orders = ["ORD-1040", "ORD-1041", "ORD-1042", "ORD-1043", "ORD-1044"]
    assert latest_three(orders) == ["ORD-1044", "ORD-1043", "ORD-1042"]


@test("Returns every order when there are fewer than three")
def _():
    assert latest_three(["ORD-1040", "ORD-1041"]) == ["ORD-1041", "ORD-1040"]


@test("Leaves the original list unchanged")
def _():
    orders = ["ORD-1040", "ORD-1041", "ORD-1042", "ORD-1043"]
    latest_three(orders)
    assert orders == ["ORD-1040", "ORD-1041", "ORD-1042", "ORD-1043"]


@hidden("Returns an empty list for no orders")
def _():
    assert latest_three([]) == []


@hidden("Works with exactly three orders")
def _():
    assert latest_three(["ORD-1", "ORD-2", "ORD-3"]) == ["ORD-3", "ORD-2", "ORD-1"]
