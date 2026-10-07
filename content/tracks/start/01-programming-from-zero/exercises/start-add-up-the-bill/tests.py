from plp import test, hidden, run_program, solution_source, source_avoids, source_uses

PRICES = "[4, 12, 3, 6]"


@test("Prints the total of the bill")
def _():
    assert run_program().lines == ["Total: 25"]


@test("Adds up the prices with a for loop")
def _():
    assert source_uses(node="For"), "Go through the prices with a for loop: for price in prices:"


@hidden("Works out a new total when the prices change")
def _():
    assert PRICES in solution_source(), "Keep the list of prices as it was given"
    assert run_program(source=solution_source().replace(PRICES, "[10, 20, 5]")).lines == ["Total: 35"]


@hidden("Gives a total of 0 for an empty bill")
def _():
    assert PRICES in solution_source(), "Keep the list of prices as it was given"
    assert run_program(source=solution_source().replace(PRICES, "[]")).lines == ["Total: 0"], (
        "With no prices at all, the total should be 0. Start the total at 0 before the loop."
    )


@hidden("Builds the total in the loop")
def _():
    assert source_avoids(call="sum"), "Build the total yourself: start at 0 and add each price inside the loop"
