from plp import test, hidden, run_program


@test("Runs without an error")
def _():
    run_program(stdin=["80"])


@test("Reminds you about the umbrella when rain is likely")
def _():
    assert run_program(stdin=["80"]).lines == ["Take an umbrella.", "Have a good day!"]


@test("Only wishes you a good day when rain is unlikely")
def _():
    assert run_program(stdin=["10"]).lines == ["Have a good day!"]


@hidden("A chance of exactly 50 counts as likely")
def _():
    assert run_program(stdin=["50"]).lines == ["Take an umbrella.", "Have a good day!"]
