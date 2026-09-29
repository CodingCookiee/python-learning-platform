import inspect
import tracemalloc
from itertools import cycle, islice, repeat

from plp import test, hidden
from solution import daily_totals, read_orders

LINE = "2026-09-{:02d},SKU-{:03d},{}\n"
EXPORT_SIZE = 6_000


def export(size):
    """A lazy stream of export lines, like reading a file. Nothing is kept in memory."""
    days = cycle(range(1, 31))
    skus = cycle(range(100))
    amounts = cycle(range(500, 9_000, 37))
    return map(LINE.format, days, skus, islice(amounts, size))


def endless_export():
    """An export that never ends, as a stream from a live system might not."""
    return map(LINE.format, repeat(1), repeat(7), repeat(850))


EXPECTED = {}
for line in export(EXPORT_SIZE):
    day, _, amount = line.strip().split(",")
    EXPECTED[day] = EXPECTED.get(day, 0) + int(amount)


@test("Totals the amounts per day")
def _():
    lines = ["2026-09-01,MUG-01,850", "2026-09-01,LAMP-02,2400", "2026-09-02,MUG-01,850"]
    assert daily_totals(lines) == {"2026-09-01": 3250, "2026-09-02": 850}


@test("read_orders is a generator")
def _():
    assert inspect.isgenerator(read_orders(["2026-09-01,MUG-01,850"])), "read_orders should return a generator"


@test("read_orders yields the first order without reading the whole stream")
def _():
    first = next(iter(read_orders(endless_export())))
    assert first == {"day": "2026-09-01", "sku": "SKU-007", "amount": 850}


@test("Totals a 6 000-line export in constant memory", timeout=10)
def _():
    tracemalloc.start()
    try:
        totals = daily_totals(export(EXPORT_SIZE))
        peak = tracemalloc.get_traced_memory()[1]
    finally:
        tracemalloc.stop()
    assert totals == EXPECTED
    assert peak < 64 * 1024, f"The peak was {peak / 1024:,.0f} KiB; streaming needs only a few KiB"


@hidden("An empty export has no totals")
def _():
    assert daily_totals([]) == {}
    assert list(read_orders([])) == []
