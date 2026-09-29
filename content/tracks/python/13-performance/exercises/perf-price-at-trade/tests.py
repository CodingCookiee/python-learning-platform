from bisect import bisect_right

from plp import test, hidden
from solution import prices_at

# A full trading day, built once when the tests load so it doesn't count against your time
DAY_CHANGES = [n * 3 // 2 for n in range(50_000)]  # a change every second or two
DAY_PRICES = [round(100 + (n * 7_919 % 2_000) / 100, 2) for n in range(50_000)]
DAY_TRADES = [n * 7_477 % 75_500 - 5 for n in range(10_000)]  # scattered, a few before the open
DAY_EXPECTED = []
for when in DAY_TRADES:
    latest = bisect_right(DAY_CHANGES, when) - 1
    DAY_EXPECTED.append(DAY_PRICES[latest] if latest >= 0 else None)


@test("Finds the price in effect at each trade")
def _():
    change_times = [0, 30, 45, 90]
    change_prices = [101.5, 101.8, 101.6, 102.0]
    assert prices_at([10, 30, 60, 200, -5], change_times, change_prices) == [101.5, 101.8, 101.6, 102.0, None]


@test("A trade at the exact time of a change gets the new price")
def _():
    assert prices_at([0, 45, 90], [0, 30, 45, 90], [101.5, 101.8, 101.6, 102.0]) == [101.5, 101.6, 102.0]


@test("Prices a full trading day in time")
def _():
    assert prices_at(DAY_TRADES, DAY_CHANGES, DAY_PRICES) == DAY_EXPECTED


@hidden("The later of two changes at the same time wins")
def _():
    assert prices_at([30, 31, 29], [0, 30, 30], [50.0, 51.0, 52.0]) == [52.0, 52.0, 50.0]


@hidden("No trades, or trades before the open")
def _():
    assert prices_at([], [0, 10], [1.0, 2.0]) == []
    assert prices_at([-1, -100], [0, 10], [1.0, 2.0]) == [None, None]
