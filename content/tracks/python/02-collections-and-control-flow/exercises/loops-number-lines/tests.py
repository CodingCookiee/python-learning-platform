from plp import test, hidden
from solution import numbered


@test("Numbers each task from 1")
def _():
    assert numbered(["Back up database", "Rotate logs", "Renew certificate"]) == [
        "1. Back up database",
        "2. Rotate logs",
        "3. Renew certificate",
    ]


@test("Returns an empty checklist for no tasks")
def _():
    assert numbered([]) == []


@test("Leaves the task list unchanged")
def _():
    tasks = ["Rotate logs", "Renew certificate"]
    numbered(tasks)
    assert tasks == ["Rotate logs", "Renew certificate"]


@hidden("Keeps counting past 9")
def _():
    result = numbered([f"Task {letter}" for letter in "ABCDEFGHIJK"])
    assert result[-1] == "11. Task K"
