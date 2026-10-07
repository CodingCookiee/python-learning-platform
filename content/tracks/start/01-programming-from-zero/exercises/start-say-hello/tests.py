from plp import test, hidden, run_program, solution_source


@test("Prints Hello, world!")
def _():
    assert run_program().lines[:1] == ["Hello, world!"]


@test("Uses print")
def _():
    assert "print(" in solution_source(), "Show the text with print( )"


@hidden("Prints nothing else")
def _():
    assert run_program().lines == ["Hello, world!"]
