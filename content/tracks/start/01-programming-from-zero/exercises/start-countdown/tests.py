from plp import test, hidden, run_program, source_uses


@test("Counts down from 5")
def _():
    assert run_program(stdin=["5"]).lines == ["5", "4", "3", "2", "1", "Lift off!"]


@test("Counts down from 3")
def _():
    assert run_program(stdin=["3"]).lines == ["3", "2", "1", "Lift off!"]


@test("Uses a while loop")
def _():
    assert source_uses(node="While"), "Count down with a while loop: while count > 0:"


@hidden("Just lifts off from 0")
def _():
    assert run_program(stdin=["0"]).lines == ["Lift off!"]


@hidden("Counts down from 10")
def _():
    assert run_program(stdin=["10"]).lines == [str(n) for n in range(10, 0, -1)] + ["Lift off!"]
