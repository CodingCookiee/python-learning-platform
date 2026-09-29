import inspect
from itertools import islice

from plp import test, hidden
from solution import backoff


@test("Doubles the delay each time")
def _():
    assert list(islice(backoff(1), 6)) == [1, 2, 4, 8, 16, 32]


@test("Never waits longer than the cap")
def _():
    assert list(islice(backoff(10, cap=60), 5)) == [10, 20, 40, 60, 60]


@test("backoff is a generator function")
def _():
    assert inspect.isgeneratorfunction(backoff), "backoff should use yield, so calling it returns a generator"


@hidden("Never runs out")
def _():
    delays = list(islice(backoff(0.5, factor=3, cap=30), 200))
    assert len(delays) == 200
    assert delays[:5] == [0.5, 1.5, 4.5, 13.5, 30]
    assert delays[-1] == 30


@hidden("Each call starts again from the base")
def _():
    first = backoff(2)
    next(first)
    next(first)
    assert next(backoff(2)) == 2
