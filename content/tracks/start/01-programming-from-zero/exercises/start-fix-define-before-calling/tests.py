from plp import test, hidden, run_program, solution_source, defined_names


@test("Runs without an error")
def _():
    run_program()


@test("Welcomes Ada, then Sam")
def _():
    assert run_program().lines == [
        "Welcome, Ada! Your table is ready.",
        "Welcome, Sam! Your table is ready.",
    ]


@hidden("Still uses the welcome function for both guests")
def _():
    assert "welcome" in defined_names("function"), "Keep the welcome function, defined with def"
    assert solution_source().count("print(") == 1, (
        "Keep the single print inside welcome, and call welcome for each guest"
    )
