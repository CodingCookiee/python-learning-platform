from plp import test, hidden
from solution import active_orders


def sample():
    return [
        ("ORD-1040", "paid"),
        ("ORD-1041", "cancelled"),
        ("ORD-1042", "cancelled"),
        ("ORD-1043", "shipped"),
    ]


@test("Drops every cancelled order, even two in a row")
def _():
    assert active_orders(sample()) == [("ORD-1040", "paid"), ("ORD-1043", "shipped")]


@test("Leaves the caller's list unchanged")
def _():
    orders = sample()
    active_orders(orders)
    assert orders == sample()


@test("Keeps every order when none are cancelled")
def _():
    orders = [("ORD-2001", "paid"), ("ORD-2002", "shipped")]
    assert active_orders(orders) == [("ORD-2001", "paid"), ("ORD-2002", "shipped")]


@hidden("Returns an empty list when every order is cancelled")
def _():
    orders = [("ORD-3001", "cancelled"), ("ORD-3002", "cancelled"), ("ORD-3003", "cancelled")]
    assert active_orders(orders) == []


@hidden("Returns a new list object")
def _():
    orders = [("ORD-4001", "paid")]
    assert active_orders(orders) is not orders, "active_orders should return a new list, not the one it was given"
