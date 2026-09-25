from plp import test, hidden, run_program


@test("Prints the greeting first")
def _():
    assert run_program().lines[:1] == ["Hello, pylearn!"]


@test("Prints \"Let's train.\" second")
def _():
    assert run_program().lines[1:2] == ["Let's train."]


@hidden("Prints nothing else")
def _():
    assert run_program().lines == ["Hello, pylearn!", "Let's train."]
