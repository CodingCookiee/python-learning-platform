from plp import test, hidden, run_program, solution_source


@test("Runs to the end without an error")
def _():
    run_program()


@test("Prints the total")
def _():
    assert "Total: 24" in run_program().lines


@test("Prints all three lines in order")
def _():
    assert run_program().lines == ["Tickets: 3", "Total: 24", "Enjoy the film!"]


@hidden("Python still works out the total")
def _():
    dearer = solution_source().replace("ticket_price = 8", "ticket_price = 10")
    assert "Total: 30" in run_program(source=dearer).lines, (
        "Keep the line ticket_price = 8 and print the total from the name total, so a new price gives a new total"
    )
