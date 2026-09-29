from plp import test, hidden
from solution import held_orders

# Built once when the tests load, so none of this counts against your time.
# Even-numbered customers are blocked; most orders come from odd-numbered ones.
BLOCKED = [f"C-{n:06d}" for n in range(0, 200_000, 2)]
NIGHTLY = [(f"ORD-{n:05d}", f"C-{n * 74 % 200_000 + (n % 50 > 0):06d}") for n in range(5_000)]
BLOCKED_SET = set(BLOCKED)
EXPECTED = [order_id for order_id, customer_id in NIGHTLY if customer_id in BLOCKED_SET]


@test("Holds the orders from blocked customers")
def _():
    orders = [("ORD-1", "C-7"), ("ORD-2", "C-3"), ("ORD-3", "C-7")]
    assert held_orders(orders, ["C-7", "C-9"]) == ["ORD-1", "ORD-3"]


@test("Keeps the orders in the order they were placed")
def _():
    orders = [("ORD-9", "C-2"), ("ORD-4", "C-1"), ("ORD-7", "C-2"), ("ORD-1", "C-5")]
    assert held_orders(orders, ["C-5", "C-2"]) == ["ORD-9", "ORD-7", "ORD-1"]


@test("Checks 5 000 orders against 100 000 blocked customers in time")
def _():
    assert held_orders(NIGHTLY, BLOCKED) == EXPECTED


@hidden("Handles nothing blocked and no orders")
def _():
    assert held_orders([("ORD-1", "C-1")], []) == []
    assert held_orders([], ["C-1"]) == []
