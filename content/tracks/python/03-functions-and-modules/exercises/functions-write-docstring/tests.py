from plp import test, hidden
from solution import late_fee


def doc_lines():
    doc = late_fee.__doc__
    assert doc is not None, "late_fee has no docstring: put a triple-quoted string on the first line inside the def"
    return [line.strip() for line in doc.strip().splitlines()]


@test("late_fee has a docstring")
def _():
    doc_lines()


@test("The first line is a short summary ending with a full stop")
def _():
    summary = doc_lines()[0]
    assert summary.endswith("."), f"The summary line should end with a full stop: {summary!r}"
    assert len(summary) <= 72, f"The summary line is {len(summary)} characters; keep it to 72 or fewer"


@test("The summary is a command, not a description of the function")
def _():
    summary = doc_lines()[0].lower()
    assert not summary.startswith(("this function", "this method", "function")), (
        "Start the summary with a verb, like \"Return the late fee…\""
    )


@test("A blank line separates the summary from the details")
def _():
    lines = doc_lines()
    assert len(lines) >= 3, "Add a blank line after the summary, then a description"
    assert lines[1] == "", "The second line of the docstring should be blank"


@test("The details name both parameters and the cap")
def _():
    details = " ".join(doc_lines()[2:])
    assert "amount_due" in details, "Describe amount_due in the details"
    assert "days_late" in details, "Describe days_late in the details"
    assert "25" in details, "Mention the 25% cap"


@hidden("The function still works the same way")
def _():
    assert late_fee(100, 5) == 10.0
    assert late_fee(100, 30) == 25.0
    assert late_fee(100, 0) == 0.0
    assert late_fee(80.5, 3) == 4.83
