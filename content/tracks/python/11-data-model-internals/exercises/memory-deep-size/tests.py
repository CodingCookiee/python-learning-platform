import sys

from plp import test, hidden
from solution import deep_size

size = sys.getsizeof


class Order:
    def __init__(self, number, lines):
        self.number = number
        self.lines = lines


@test("Counts a dict, its keys and values, and a shared note once")
def _():
    note = "gift wrap" * 100
    order = {"id": "A1042", "notes": [note, note]}
    expected = size(order) + size("id") + size("A1042") + size("notes") + size(order["notes"]) + size(note)
    assert deep_size(order) == expected


@test("Follows lists, tuples and sets")
def _():
    sku, name = "MUG-01" * 20, "Stoneware mug" * 20
    line = (sku, name)
    assert deep_size([line]) == size([line]) + size(line) + size(sku) + size(name)
    tags = {"fragile" * 30, "gift" * 30}
    assert deep_size(tags) == size(tags) + sum(size(tag) for tag in tags)
    frozen = frozenset(tags)
    assert deep_size(frozen) == size(frozen) + sum(size(tag) for tag in tags)


@test("Plain values are just their own size")
def _():
    assert deep_size(12345678901234567890) == size(12345678901234567890)
    assert deep_size("A1042") == size("A1042")
    assert deep_size([]) == size([])


@hidden("Follows an object's __dict__")
def _():
    lines = [("MUG-01" * 10, 2)]
    order = Order("A1042" * 10, lines)
    attributes = vars(order)
    expected = (
        size(order) + size(attributes) + size("number") + size(order.number) + size("lines")
        + size(lines) + size(lines[0]) + size(lines[0][0]) + size(2)
    )
    assert deep_size(order) == expected


@hidden("A structure that contains itself is counted once, without looping")
def _():
    basket = ["MUG-01" * 10]
    basket.append(basket)
    assert deep_size(basket) == size(basket) + size(basket[0])
    parent = {"name": "INV-7" * 10}
    child = {"parent": parent}
    parent["child"] = child
    assert deep_size(parent) == (
        size(parent) + size("name") + size(parent["name"]) + size("child") + size(child) + size("parent")
    )


@hidden("Handles deep nesting without hitting the recursion limit")
def _():
    nested = []
    for _ in range(5_000):
        nested = [nested]
    assert deep_size(nested) == size([[]]) * 5_000 + size([])
