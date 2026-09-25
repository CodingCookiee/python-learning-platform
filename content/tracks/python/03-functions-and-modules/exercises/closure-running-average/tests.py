from plp import test, hidden, source_avoids
from solution import make_averager


def averager():
    made = make_averager()
    assert callable(made), f"make_averager should return a function, but it returned {made!r}"
    return made


@test("Returns the running average after each time")
def _():
    api = averager()
    assert api(120) == 120.0
    assert api(80) == 100.0
    assert api(95) == 98.3


@test("Called with no argument, returns the average without adding")
def _():
    api = averager()
    api(120)
    api(80)
    assert api() == 100.0
    assert api() == 100.0


@test("Nothing recorded yet gives None")
def _():
    assert averager()() is None


@test("Each averager keeps its own figures")
def _():
    checkout = averager()
    search = averager()
    checkout(300)
    search(20)
    assert checkout(100) == 200.0
    assert search() == 20.0


@hidden("Counts a response time of 0")
def _():
    api = averager()
    api(0)
    assert api() == 0.0, "A time of 0 ms is a real measurement: check for None with `is None`"
    assert api(10) == 5.0


@hidden("Doesn't use global variables")
def _():
    assert source_avoids(node="Global"), "Keep the figures in the closure with nonlocal, not in globals"
