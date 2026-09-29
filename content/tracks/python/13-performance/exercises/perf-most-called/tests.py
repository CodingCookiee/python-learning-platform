import sys

from plp import test, hidden
from solution import most_called


def is_valid(line):
    return line.count(",") == 2


def parse(line):
    sku, quantity, price = line.split(",")
    return sku, int(quantity), float(price)


def load(lines):
    return [parse(line) for line in lines if is_valid(line)]


def category_size(category):
    size = 1
    for child in category["children"]:
        size += category_size(child)
    return size


def audit(catalogue, lines):
    load(lines)
    load(lines)
    return category_size(catalogue)


LINES = ["MUG-01,2,8.50", "oops", "LAMP-02,1,24.00", "MUG-01,1,8.50"]
CATALOGUE = {"children": [{"children": []}, {"children": [{"children": []}, {"children": []}]}]}


@test("Lists the most-called functions")
def _():
    assert most_called(load, LINES, n=2) == [("is_valid", 4), ("parse", 3)]


@test("Leaves out built-ins")
def _():
    names = [name for name, calls in most_called(load, LINES, n=10)]
    assert names == ["is_valid", "parse", "load"]


@test("Counts every call of a recursive function")
def _():
    assert most_called(category_size, CATALOGUE, n=1) == [("category_size", 5)]


@test("Breaks ties alphabetically")
def _():
    assert most_called(audit, CATALOGUE, LINES, n=4) == [
        ("is_valid", 8),
        ("parse", 6),
        ("category_size", 5),
        ("load", 2),
    ]


@hidden("Defaults to the top three")
def _():
    assert most_called(audit, CATALOGUE, LINES) == [("is_valid", 8), ("parse", 6), ("category_size", 5)]


@hidden("Switches the profiler off when fn raises")
def _():
    def broken(lines):
        parse(lines[0])
        raise RuntimeError("feed went away")

    try:
        most_called(broken, LINES)
    except RuntimeError:
        pass
    else:
        raise AssertionError("most_called should let the RuntimeError from fn propagate")
    assert sys.monitoring.get_tool(sys.monitoring.PROFILER_ID) is None, "The profiler is still switched on"
    assert most_called(load, LINES, n=1) == [("is_valid", 4)]
