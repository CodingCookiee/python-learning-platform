from plp import test, hidden, raises
from solution import OrderLines


def sample():
    return OrderLines([("MUG-01", 2), ("TEA-50", 1), ("LAMP-02", 1)])


@test("Supports len, indexing, slicing, in and truth tests")
def _():
    lines = sample()
    assert len(lines) == 3
    assert lines[-1] == ("LAMP-02", 1)
    assert lines[:2] == OrderLines([("MUG-01", 2), ("TEA-50", 1)])
    assert repr(lines[:2]) == "OrderLines([('MUG-01', 2), ('TEA-50', 1)])"
    assert ("TEA-50" in lines) is True
    assert bool(OrderLines([])) is False


@test("in looks at SKUs")
def _():
    lines = sample()
    assert "LAMP-02" in lines
    assert "DESK-9" not in lines
    assert ("MUG-01", 2) not in lines


@test("Iterates over the line tuples in order")
def _():
    assert list(sample()) == [("MUG-01", 2), ("TEA-50", 1), ("LAMP-02", 1)]
    assert sum(quantity for _, quantity in sample()) == 4


@hidden("A slice is a new OrderLines, and the original is untouched")
def _():
    lines = sample()
    tail = lines[1:]
    assert isinstance(tail, OrderLines)
    assert list(tail) == [("TEA-50", 1), ("LAMP-02", 1)]
    assert lines[::2] == OrderLines([("MUG-01", 2), ("LAMP-02", 1)])
    assert len(lines) == 3


@hidden("An index past the end raises IndexError")
def _():
    lines = sample()
    raises(IndexError, lines.__getitem__, 3)
    raises(IndexError, OrderLines([]).__getitem__, 0)
    assert lines[0] == ("MUG-01", 2)


@hidden("Equality compares the lines, in order")
def _():
    assert sample() == sample()
    assert OrderLines([("A", 1), ("B", 1)]) != OrderLines([("B", 1), ("A", 1)])
    assert sample() != [("MUG-01", 2), ("TEA-50", 1), ("LAMP-02", 1)]
    assert bool(sample()) is True
