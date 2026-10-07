from plp import test, run_program


@test("Runs to the end without an error")
def _():
    run_program()


@test("Prints the table number")
def _():
    assert "Your table: 4" in run_program().lines


@test("Prints all three lines in order")
def _():
    assert run_program().lines == ["Order received", "Your table: 4", "Thank you!"]
