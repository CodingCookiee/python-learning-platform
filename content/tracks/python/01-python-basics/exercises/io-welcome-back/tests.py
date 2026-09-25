from plp import test, hidden, run_program


@test("Greets Ada")
def _():
    assert run_program(stdin=["Ada"]).lines == ["Welcome back, Ada!"]


@test("Strips spaces around the name")
def _():
    assert run_program(stdin=["  Grace "]).lines == ["Welcome back, Grace!"]


@hidden("Keeps a full name together")
def _():
    assert run_program(stdin=["Lin Wei"]).lines == ["Welcome back, Lin Wei!"]
