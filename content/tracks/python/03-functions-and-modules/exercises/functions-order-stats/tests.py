from plp import test, hidden
from solution import order_stats


@test("Returns count, total and average")
def _():
    assert order_stats([12.5, 30.0, 7.25]) == (3, 49.75, 16.58)


@test("An empty day has no average")
def _():
    assert order_stats([]) == (0, 0.0, None)


@test("Works with a single order")
def _():
    assert order_stats([19.99]) == (1, 19.99, 19.99)


@hidden("Rounds the total to cents")
def _():
    assert order_stats([0.1, 0.2]) == (2, 0.3, 0.15)


@hidden("Returns a tuple the caller can unpack")
def _():
    result = order_stats([10, 20])
    assert type(result) is tuple, f"order_stats should return a tuple, not a {type(result).__name__}"
    count, total, average = result
    assert (count, total, average) == (2, 30, 15.0)


@hidden("Leaves the list unchanged")
def _():
    amounts = [5.0, 15.0]
    order_stats(amounts)
    assert amounts == [5.0, 15.0]
