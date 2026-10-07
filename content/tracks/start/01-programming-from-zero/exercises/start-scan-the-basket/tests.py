import re

from plp import test, hidden, load_module, run_program, solution_source


@test("Prints the total after the apples")
def _():
    assert run_program().lines[:1] == ["Total so far: 3"]


@test("Prints the total after every item")
def _():
    assert run_program().lines == ["Total so far: 3", "Total so far: 5", "Total so far: 10", "Total so far: 14"]


@test("Keeps the total in a name called total")
def _():
    assert getattr(load_module(), "total", None) == 14, (
        "At the end, the name total should hold 14, the price of the whole basket"
    )


@hidden("Follows a change of price")
def _():
    source = solution_source()
    pattern = r"^(\s*cheese\s*=\s*)5\b"
    assert re.search(pattern, source, re.M), "Keep the line cheese = 5 from the starter"
    changed = re.sub(pattern, r"\g<1>7", source, count=1, flags=re.M)
    assert run_program(source=changed).lines == [
        "Total so far: 3",
        "Total so far: 5",
        "Total so far: 12",
        "Total so far: 16",
    ], "When cheese costs 7, the totals after it should change too: add the names, not the numbers"
