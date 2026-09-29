from decimal import Decimal, InvalidOperation

from plp import test, hidden, raises
from solution import Collector

ROWS = [{"sku": "MUG-01", "qty": "3"}, {"sku": "TEA-12", "qty": "two"}, {"sku": "PEN-05"}]


def read_quantities(collector, rows):
    quantities = []
    for row in rows:
        with collector:
            quantities.append(int(row["qty"]))
    return quantities


@test("Collects the bad rows and carries on")
def _():
    collector = Collector(ValueError, KeyError)
    assert read_quantities(collector, ROWS) == [3]
    assert collector.summary() == ["ValueError: invalid literal for int() with base 10: 'two'", "KeyError: 'qty'"]


@test("Keeps the exception objects themselves")
def _():
    collector = Collector(ValueError, KeyError)
    read_quantities(collector, ROWS)
    assert [type(error) for error in collector.errors] == [ValueError, KeyError]


@test("Lets other exceptions through without recording them")
def _():
    collector = Collector(ValueError)
    with raises(ZeroDivisionError):
        with collector:
            print(12 / 0)
    assert collector.errors == []


@test("as gives the collector, and a clean block records nothing")
def _():
    collector = Collector(ValueError)
    with collector as active:
        total = 2 + 2
    assert active is collector
    assert collector.errors == []
    assert collector.summary() == []


@hidden("Collects subclasses of the given types")
def _():
    class BadRow(ValueError):
        pass

    collector = Collector(ValueError, ArithmeticError)
    with collector:
        raise BadRow("row 7: no SKU")
    with collector:
        Decimal("n/a")
    assert [type(error) for error in collector.errors] == [BadRow, InvalidOperation]
    assert collector.summary()[0] == "BadRow: row 7: no SKU"


@hidden("Collects across many blocks and keeps working after an escape")
def _():
    collector = Collector(KeyError)
    with collector:
        {}["first"]
    with raises(TypeError):
        with collector:
            len(5)
    with collector:
        {}["second"]
    assert collector.summary() == ["KeyError: 'first'", "KeyError: 'second'"]
