from plp import test, hidden, run_program, source_uses


@test("Prints the 7 times table")
def _():
    assert run_program(stdin=["7"]).lines == [
        "1 x 7 = 7",
        "2 x 7 = 14",
        "3 x 7 = 21",
        "4 x 7 = 28",
        "5 x 7 = 35",
        "6 x 7 = 42",
        "7 x 7 = 49",
        "8 x 7 = 56",
        "9 x 7 = 63",
        "10 x 7 = 70",
    ]


@test("Starts at 1 x and ends at 10 x")
def _():
    assert run_program(stdin=["3"]).lines[:1] == ["1 x 3 = 3"]
    assert run_program(stdin=["3"]).lines[-1:] == ["10 x 3 = 30"]


@test("Uses a for loop")
def _():
    assert source_uses(node="For"), "Print the lines with a for loop over range(1, 11)"


@hidden("Prints the 12 times table")
def _():
    assert run_program(stdin=["12"]).lines == [f"{n} x 12 = {n * 12}" for n in range(1, 11)]


@hidden("Prints exactly ten lines")
def _():
    assert len(run_program(stdin=["5"]).lines) == 10, "Print ten lines, from 1 x 5 = 5 to 10 x 5 = 50"
