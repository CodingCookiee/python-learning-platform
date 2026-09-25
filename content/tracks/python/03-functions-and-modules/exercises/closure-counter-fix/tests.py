from plp import test, hidden, source_avoids
from solution import make_counter


@test("Counts up from 001")
def _():
    billing = make_counter("BILL")
    assert billing() == "BILL-001"
    assert billing() == "BILL-002"


@test("Each counter keeps its own count")
def _():
    billing = make_counter("BILL")
    support = make_counter("HELP")
    billing()
    billing()
    assert support() == "HELP-001"
    assert billing() == "BILL-003"


@test("Doesn't use global")
def _():
    assert source_avoids(node="Global"), "Use nonlocal: a global count would be shared by every counter"


@hidden("Keeps counting past 999")
def _():
    desk = make_counter("OPS")
    for _ in range(999):
        desk()
    assert desk() == "OPS-1000"


@hidden("A new counter starts again from 001")
def _():
    make_counter("X")()
    assert make_counter("X")() == "X-001"
