from plp import test, run_program


@test("Runs without an error")
def _():
    run_program(stdin=["Paris"])


@test("Paris is correct")
def _():
    assert run_program(stdin=["Paris"]).lines == ["Correct! One point to you."]


@test("Any other answer is not")
def _():
    assert run_program(stdin=["Rome"]).lines == ["Not quite. The answer is Paris."]
