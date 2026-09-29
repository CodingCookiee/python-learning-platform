import tracemalloc
from itertools import count, islice, repeat
from operator import mod, mul

from plp import test, hidden
from solution import largest_orders

DAY_SIZE = 8_000


def daily_export():
    """A lazy stream of 8 000 export lines, like reading a file. Nothing is kept in memory."""
    ids = islice(count(1), DAY_SIZE)
    amounts = map(mod, map(mul, count(1), repeat(7_919)), repeat(249_989))  # n * 7919 % 249989
    return map("ORD-{:06d},{}\n".format, ids, amounts)


# The answer, worked out once when the tests load
DAY = [(f"ORD-{n:06d}", n * 7_919 % 249_989) for n in range(1, DAY_SIZE + 1)]
TOP_TEN = sorted(DAY, key=lambda order: order[1], reverse=True)[:10]


@test("Returns the biggest orders first")
def _():
    lines = ["ORD-1,4500", "ORD-2,120", "", "ORD-3,98000", "ORD-4,4500"]
    assert largest_orders(lines, 3) == [("ORD-3", 98000), ("ORD-1", 4500), ("ORD-4", 4500)]


@test("Returns every order when there are fewer than k")
def _():
    assert largest_orders(["ORD-7,300\n", "  \n", "ORD-8,900\n"], 5) == [("ORD-8", 900), ("ORD-7", 300)]


@test("Finds the top ten in a day's stream without keeping it", timeout=10)
def _():
    tracemalloc.start()
    try:
        top = largest_orders(daily_export(), 10)
        peak = tracemalloc.get_traced_memory()[1]
    finally:
        tracemalloc.stop()
    assert top == TOP_TEN
    assert peak < 64 * 1024, f"The peak was {peak / 1024:,.0f} KiB; keeping ten orders needs only a few KiB"


@hidden("Keeps arrival order on ties")
def _():
    lines = [f"ORD-{n},500" for n in range(1, 6)]
    assert largest_orders(lines, 3) == [("ORD-1", 500), ("ORD-2", 500), ("ORD-3", 500)]


@hidden("An empty stream has no orders")
def _():
    assert largest_orders(iter([]), 3) == []
    assert largest_orders(["", "\n"], 3) == []
