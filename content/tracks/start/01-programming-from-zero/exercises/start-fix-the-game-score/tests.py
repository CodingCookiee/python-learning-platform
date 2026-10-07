from plp import test, hidden, run_program, solution_source, source_uses

ROUNDS = "[10, 25, 5, 40]"


@test("Adds up all four rounds")
def _():
    assert run_program().lines == ["Final score: 80"]


@test("Still adds up the rounds with the loop")
def _():
    assert source_uses(node="For"), "Keep the for loop: fix where the score starts instead"


@hidden("Adds up a different game")
def _():
    assert ROUNDS in solution_source(), "Keep the list of rounds as it was given"
    assert run_program(source=solution_source().replace(ROUNDS, "[7, 3, 12]")).lines == ["Final score: 22"]
