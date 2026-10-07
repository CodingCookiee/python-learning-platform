from plp import test, hidden, run_program


@test("A 13-year-old pays the adult price")
def _():
    assert run_program(stdin=["13"]).lines == ["Adult ticket: 12", "Enjoy the zoo!"]


@test("A 12-year-old pays the child price")
def _():
    assert run_program(stdin=["12"]).lines == ["Child ticket: 6", "Enjoy the zoo!"]


@test("A 65-year-old pays the senior price")
def _():
    assert run_program(stdin=["65"]).lines == ["Senior ticket: 8", "Enjoy the zoo!"]


@hidden("A 64-year-old still pays the adult price")
def _():
    assert run_program(stdin=["64"]).lines == ["Adult ticket: 12", "Enjoy the zoo!"]


@hidden("A baby gets a child ticket")
def _():
    assert run_program(stdin=["0"]).lines == ["Child ticket: 6", "Enjoy the zoo!"]


@hidden("A 90-year-old pays the senior price")
def _():
    assert run_program(stdin=["90"]).lines == ["Senior ticket: 8", "Enjoy the zoo!"]
