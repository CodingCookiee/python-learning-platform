import re

from plp import test, hidden, run_program, solution_source


@test("Runs to the end without an error")
def _():
    run_program()


@test("Prints the cake")
def _():
    assert "Cake: 4" in run_program().lines


@test("Prints all three lines in order")
def _():
    assert run_program().lines == ["Coffee: 3", "Cake: 4", "Total: 7"]


@hidden("Prints the cake price from its name")
def _():
    source = solution_source()
    pattern = r"^(\s*cake\s*=\s*)4\b"
    assert re.search(pattern, source, re.M), "Keep the line cake = 4, and move it up rather than typing the 4 into a print"
    changed = re.sub(pattern, r"\g<1>5", source, count=1, flags=re.M)
    assert run_program(source=changed).lines == ["Coffee: 3", "Cake: 5", "Total: 8"], (
        "When cake is 5, the bill should say Cake: 5. Move the line cake = 4 up, rather than typing the 4 into a print"
    )
