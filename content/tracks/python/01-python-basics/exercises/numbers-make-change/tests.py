from plp import test, hidden
from solution import make_change


@test("Pays out 68 cents")
def _():
    assert make_change(68) == (2, 1, 1, 3)


@test("Pays a dollar in 25s only")
def _():
    assert make_change(100) == (4, 0, 0, 0)


@test("Pays nothing for zero cents")
def _():
    assert make_change(0) == (0, 0, 0, 0)


@hidden("Uses every coin once for 41 cents")
def _():
    assert make_change(41) == (1, 1, 1, 1)


@hidden("Pays out 99 cents")
def _():
    assert make_change(99) == (3, 2, 0, 4)


@hidden("Pays out less than one coin of each size")
def _():
    assert make_change(4) == (0, 0, 0, 4)
    assert make_change(9) == (0, 0, 1, 4)
