from plp import test, hidden
from solution import count_by_status


def sample():
    return [
        ("ORD-1040", "paid"),
        ("ORD-1041", "shipped"),
        ("ORD-1042", "paid"),
        ("ORD-1043", "refunded"),
        ("ORD-1044", "paid"),
    ]


@test("Counts the orders with each status")
def _():
    assert count_by_status(sample()) == {"paid": 3, "shipped": 1, "refunded": 1}


@test("Lists statuses in the order they're first seen")
def _():
    assert list(count_by_status(sample())) == ["paid", "shipped", "refunded"]


@test("Returns an empty dict for no orders")
def _():
    assert count_by_status([]) == {}


@hidden("Leaves the orders unchanged")
def _():
    orders = sample()
    count_by_status(orders)
    assert orders == sample()


@hidden("Handles a single status")
def _():
    assert count_by_status([("ORD-1", "shipped"), ("ORD-2", "shipped")]) == {"shipped": 2}
