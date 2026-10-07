from plp import test, hidden, run_program, solution_source, defined_names

ANNOUNCEMENT = ["Attention, shoppers!", "The shop closes in 10 minutes."]


@test("Prints the announcement twice")
def _():
    assert run_program().lines == ANNOUNCEMENT * 2


@test("Defines a function called announce")
def _():
    assert "announce" in defined_names("function"), "Define the function with def announce():"


@hidden("Writes each print only once")
def _():
    assert solution_source().count("print(") <= 2, (
        "Put the two print lines inside announce, then call announce twice instead of printing again"
    )
