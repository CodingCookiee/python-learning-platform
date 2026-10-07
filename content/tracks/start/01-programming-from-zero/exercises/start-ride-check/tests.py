from plp import test, hidden, run_program


@test("A 10-year-old who is 135 cm can ride")
def _():
    assert run_program(stdin=["10", "135"]).lines == ["You can ride!"]


@test("A 12-year-old who is 115 cm is too short")
def _():
    assert run_program(stdin=["12", "115"]).lines == ["Sorry, not this time."]


@test("A 7-year-old is too young, however tall")
def _():
    assert run_program(stdin=["7", "150"]).lines == ["Sorry, not this time."]


@hidden("Exactly 8 years old and 120 cm is enough")
def _():
    assert run_program(stdin=["8", "120"]).lines == ["You can ride!"]


@hidden("Too young and too short can't ride")
def _():
    assert run_program(stdin=["6", "100"]).lines == ["Sorry, not this time."]
