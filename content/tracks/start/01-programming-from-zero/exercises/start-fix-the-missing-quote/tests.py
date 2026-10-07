from plp import test, run_program


@test("Runs without an error")
def _():
    run_program()


@test("Prints the welcome first")
def _():
    assert run_program().lines[:1] == ["Welcome to the café!"]


@test("Prints the special second")
def _():
    assert run_program().lines == ["Welcome to the café!", "Today's special: soup"]
