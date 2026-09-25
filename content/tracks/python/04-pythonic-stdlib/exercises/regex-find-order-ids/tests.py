from plp import test, hidden
from solution import find_order_ids


@test("Finds both order ids and skips the short one")
def _():
    assert find_order_ids("Hi, ORD-1042 and ORD-20931 never arrived. Ref ORD-12.") == ["ORD-1042", "ORD-20931"]


@test("Returns an empty list when there are none")
def _():
    assert find_order_ids("Where is my parcel?") == []


@test("Finds ids next to punctuation")
def _():
    assert find_order_ids("(ORD-5555), ORD-6666!") == ["ORD-5555", "ORD-6666"]


@hidden("Ignores ids that are part of a longer word")
def _():
    assert find_order_ids("XORD-1234 ORD-1234x ORD-1234") == ["ORD-1234"]


@hidden("Is case-sensitive")
def _():
    assert find_order_ids("ord-1234 Ord-1234") == []
