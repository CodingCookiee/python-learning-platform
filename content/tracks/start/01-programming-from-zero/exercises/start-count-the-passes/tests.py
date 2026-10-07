from plp import test, hidden, run_program, solution_source, source_uses

MARKS = "[72, 45, 90, 38, 66]"


@test("Prints pass or fail for each mark")
def _():
    assert run_program().lines[:5] == ["72 pass", "45 fail", "90 pass", "38 fail", "66 pass"]


@test("Says how many passed")
def _():
    assert run_program().lines[5:] == ["3 of 5 passed"]


@test("Uses a for loop")
def _():
    assert source_uses(node="For"), "Go through the marks with a for loop: for mark in marks:"


@hidden("A mark of exactly 50 is a pass")
def _():
    assert MARKS in solution_source(), "Keep the list of marks as it was given"
    assert run_program(source=solution_source().replace(MARKS, "[50, 49]")).lines == [
        "50 pass",
        "49 fail",
        "1 of 2 passed",
    ]


@hidden("Counts again when the marks change")
def _():
    assert MARKS in solution_source(), "Keep the list of marks as it was given"
    assert run_program(source=solution_source().replace(MARKS, "[80, 20, 95, 61, 55, 10]")).lines == [
        "80 pass",
        "20 fail",
        "95 pass",
        "61 pass",
        "55 pass",
        "10 fail",
        "4 of 6 passed",
    ]
