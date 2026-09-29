from plp import test, hidden
from solution import OrderBatch, batch_summary

ORDERS = [("A1", 12.5), ("A2", 8.0), ("A3", 30.0)]


@test("The summary counts and totals every order")
def _():
    batch = OrderBatch(ORDERS)
    assert batch_summary(batch) == {"orders": 3, "total": 50.5}


@test("Looping twice sees the same orders")
def _():
    batch = OrderBatch(ORDERS)
    assert list(batch) == ORDERS
    assert list(batch) == ORDERS


@test("Nested loops see every pair")
def _():
    batch = OrderBatch(ORDERS)
    pairs = [(a[0], b[0]) for a in batch for b in batch]
    assert len(pairs) == 9, f"expected 9 pairs from two nested loops over 3 orders, got {len(pairs)}"


@hidden("Each loop gets its own iterator")
def _():
    batch = OrderBatch(ORDERS)
    assert iter(batch) is not batch, "iter(batch) should return a new iterator, not the batch itself"
    first, second = iter(batch), iter(batch)
    next(first)
    assert next(second) == ("A1", 12.5)


@hidden("The summary can be asked for again")
def _():
    batch = OrderBatch(ORDERS)
    batch_summary(batch)
    assert batch_summary(batch) == {"orders": 3, "total": 50.5}
    assert len(batch) == 3


@hidden("An empty batch")
def _():
    assert batch_summary(OrderBatch([])) == {"orders": 0, "total": 0}
