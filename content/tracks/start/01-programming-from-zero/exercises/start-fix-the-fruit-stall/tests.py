from plp import test, hidden, run_program


@test("Prices 2.5 kilos")
def _():
    assert run_program(stdin=["2.5"]).lines == ["2.5 kg of apples costs 7.5"]


@test("Prices half a kilo")
def _():
    assert run_program(stdin=["0.5"]).lines == ["0.5 kg of apples costs 1.5"]


@hidden("Still works for whole kilos")
def _():
    assert run_program(stdin=["2"]).lines == ["2.0 kg of apples costs 6.0"]
