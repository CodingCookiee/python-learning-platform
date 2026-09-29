from plp import test, hidden
from solution import find_mutable_defaults

MESSAGE = "B006 Do not use mutable data structures for argument defaults"


@test("Finds the shared tags list")
def _():
    source = "def add_tag(order, tag, tags=[]):\n    tags.append(tag)\n    return tags\n"
    assert find_mutable_defaults(source) == [f"1:30: {MESSAGE}"]


@test("Finds displays, comprehensions and calls")
def _():
    source = """from collections import defaultdict
import collections

def report(rows, totals={}, seen=set(), by_day=defaultdict(list), recent=collections.deque()):
    ...

def squares(limit, cache={n: n * n for n in range(10)}):
    ...
"""
    assert find_mutable_defaults(source) == [
        f"4:25: {MESSAGE}",
        f"4:34: {MESSAGE}",
        f"4:48: {MESSAGE}",
        f"4:74: {MESSAGE}",
        f"7:26: {MESSAGE}",
    ]


@test("Leaves immutable defaults alone")
def _():
    source = """def ship(order, carrier="dpd", weight=0.0, tags=(), notes=None, codes=frozenset(), express=False):
    ...
"""
    assert find_mutable_defaults(source) == []


@test("Checks methods, async functions, lambdas and keyword-only parameters")
def _():
    source = """class Cart:
    def add(self, item, extras=[]):
        ...

async def fetch(url, *, headers={}, timeout=5):
    ...

make_order = lambda lines=[]: {"lines": lines}
"""
    assert find_mutable_defaults(source) == [f"2:32: {MESSAGE}", f"5:33: {MESSAGE}", f"8:27: {MESSAGE}"]


@test("Respects noqa on the default's line")
def _():
    source = """def cached(key, memo={}):  # noqa: B006  (the shared dict is the point)
    ...

def tagged(tags=[]):  # noqa
    ...

def other(tags=[]):  # noqa: E501
    ...
"""
    assert find_mutable_defaults(source) == [f"7:16: {MESSAGE}"]


@hidden("Reports a multi-line signature at the default's own line")
def _():
    source = """def invoice(
    customer,
    lines=[],
    discounts={},  # noqa: B006
):
    ...
"""
    assert find_mutable_defaults(source) == [f"3:11: {MESSAGE}"]
