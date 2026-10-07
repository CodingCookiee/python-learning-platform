from plp import test, hidden, run_program, source_uses


@test("Runs without an error")
def _():
    run_program()


@test("Cheers three times")
def _():
    assert run_program().lines[:3] == ["Hip hip hooray!", "Hip hip hooray!", "Hip hip hooray!"]


@test("Prints the birthday line once, at the end")
def _():
    assert run_program().lines == [
        "Hip hip hooray!",
        "Hip hip hooray!",
        "Hip hip hooray!",
        "Happy birthday, Sam!",
    ]


@hidden("Repeats the cheer with the loop")
def _():
    assert source_uses(node="For"), "Keep the for loop and fix the line that starts it, rather than copying the cheer"
