from plp import test, hidden, run_program


@test("Prices three coffees")
def _():
    assert run_program(stdin=["3"]).lines == ["3 coffees: 9.60"]


@test("Accepts spaces around the number")
def _():
    assert run_program(stdin=[" 2 "]).lines == ["2 coffees: 6.40"]


@hidden("Prices a large order")
def _():
    assert run_program(stdin=["10"]).lines == ["10 coffees: 32.00"]
