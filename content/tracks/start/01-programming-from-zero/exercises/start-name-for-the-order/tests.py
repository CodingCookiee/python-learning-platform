from plp import test, hidden, run_program


@test("Thanks Sam")
def _():
    assert run_program(stdin=["Sam"]).lines == ["Thanks, Sam! Your order will be ready soon."]


@test("Thanks Ada")
def _():
    assert run_program(stdin=["Ada"]).lines == ["Thanks, Ada! Your order will be ready soon."]


@hidden("Keeps a full name together")
def _():
    assert run_program(stdin=["Lin Wei"]).lines == ["Thanks, Lin Wei! Your order will be ready soon."]
