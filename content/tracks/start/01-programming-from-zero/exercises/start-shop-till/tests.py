from plp import test, hidden, run_program, solution_source


@test("Prices 3 items at 2.50")
def _():
    assert run_program(stdin=["2.50", "3"]).lines == ["Cost: 7.5"]


@test("Prices 2 items at 4")
def _():
    assert run_program(stdin=["4", "2"]).lines == ["Cost: 8.0"]


@hidden("Prices 4 items at 0.75")
def _():
    assert run_program(stdin=["0.75", "4"]).lines == ["Cost: 3.0"]


@hidden("Prices a single item")
def _():
    assert run_program(stdin=["12.25", "1"]).lines == ["Cost: 12.25"]


@hidden("Rounds the cost to pence")
def _():
    assert "round(" in solution_source(), "Round the cost to two decimal places, for example round(price * quantity, 2)"
