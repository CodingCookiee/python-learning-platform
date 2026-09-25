from plp import test, hidden, run_program, solution_source


@test("Runs and prints all three lines")
def _():
    assert run_program().lines == [
        "Free shipping",
        "Your order qualifies",
        "Order total: 150",
    ]


@test("The total line isn't part of the if block")
def _():
    small_order = solution_source().replace("total = 150", "total = 50")
    assert run_program(source=small_order).lines == ["Order total: 50"], (
        "With a total of 50, only the total line should print"
    )


@hidden("Uses four-space indentation")
def _():
    indents = {
        len(line) - len(line.lstrip(" "))
        for line in solution_source().splitlines()
        if line.strip() and line.startswith(" ")
    }
    assert indents == {4}, "Indent block lines by exactly four spaces"
