from plp import test, hidden
from solution import with_task


@test("Returns the list with the task added")
def _():
    assert with_task(["write report"], "call bank") == ["write report", "call bank"]


@test("Leaves the original list unchanged")
def _():
    monday = ["write report"]
    with_task(monday, "call bank")
    assert monday == ["write report"]


@test("Returns a different list object")
def _():
    monday = ["write report"]
    assert with_task(monday, "call bank") is not monday


@hidden("Works on an empty list")
def _():
    empty = []
    assert with_task(empty, "rest") == ["rest"]
    assert empty == []
