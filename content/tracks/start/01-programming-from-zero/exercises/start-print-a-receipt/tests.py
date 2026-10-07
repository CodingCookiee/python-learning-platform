from plp import test, hidden, run_program, solution_source


@test("Prints the coffee and the muffin")
def _():
    assert run_program().lines[:2] == ["Coffee 3", "Muffin 2"]


@test("Prints the total")
def _():
    assert run_program().lines == ["Coffee 3", "Muffin 2", "Total 5"]


@hidden("Python adds up the total")
def _():
    assert "+" in solution_source(), "Let Python work out the total with +, for example 3 + 2"
