from plp import test, hidden, run_program, solution_source


@test("Prints the tickets and the price")
def _():
    assert run_program().lines[:2] == ["Tickets: 2", "Price each: 8"]


@test("Prints the total")
def _():
    assert run_program().lines == ["Tickets: 2", "Price each: 8", "Total: 16"]


@hidden("Python multiplies for the total")
def _():
    assert "*" in solution_source(), "Let Python work out the total with *, for example 2 * 8"
