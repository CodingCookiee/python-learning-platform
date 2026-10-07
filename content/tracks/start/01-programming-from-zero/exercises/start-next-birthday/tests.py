from plp import test, hidden, run_program


@test("Works for 17")
def _():
    assert run_program(stdin=["17"]).lines == ["On your next birthday you'll be 18."]


@test("Works for 30")
def _():
    assert run_program(stdin=["30"]).lines == ["On your next birthday you'll be 31."]


@hidden("Works for 99")
def _():
    assert run_program(stdin=["99"]).lines == ["On your next birthday you'll be 100."]
