import re
from functools import cache

from plp import hidden, solution_source, test, typecheck
from solution import format_cents, line_total

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    "text: str = format_cents(line_total(2, 450))",
    "cents: int = line_total(3, 1999)",
]
REJECTED = [
    'line_total("2", 450)',
    "format_cents(12.5)",
    "label: int = format_cents(900)",
]


@cache
def mypy_report() -> dict[str, list[str]]:
    code = solution_source().rstrip() + "\n"
    first = code.count("\n") + 4  # the line of the first appended use
    uses = ACCEPTED + REJECTED
    probe = code + "\n\ndef _uses() -> None:\n" + "".join(f"    {use}\n" for use in uses)
    own: list[str] = []
    flagged: dict[int, list[str]] = {}
    for error in typecheck(probe, strict=True).errors:
        found = re.match(r"solution\.py:(\d+):", error)
        line = int(found.group(1)) if found else 0
        if line < first:
            own.append(error)
        else:
            flagged.setdefault(line - first, []).append(error.split(": error: ", 1)[-1])
    # A call to an unannotated function is flagged too, but that isn't mypy catching the misuse
    rejected = {i for i, errors in flagged.items() if any("[no-untyped-call]" not in e for e in errors)}
    return {
        "own": own,
        "accepted": [f"{use}\n    {e}" for i, use in enumerate(ACCEPTED) for e in flagged.get(i, [])],
        "missed": [use for i, use in enumerate(REJECTED, start=len(ACCEPTED)) if i not in rejected],
    }


@test("Prices a line and formats it")
def _():
    assert line_total(2, 450) == 900
    assert format_cents(900) == "9.00 EUR"


@test("mypy --strict passes", timeout=None)
def _():
    problems = mypy_report()["own"]
    assert problems == [], "mypy --strict reports:\n" + "\n".join(problems)


@test("mypy accepts correct calls", timeout=None)
def _():
    problems = mypy_report()["accepted"]
    assert problems == [], "mypy rejects correct code:\n" + "\n".join(problems)


@test("mypy rejects a string quantity, float cents, and the text used as a number", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Formats small and large amounts")
def _():
    assert format_cents(5) == "0.05 EUR"
    assert format_cents(123456) == "1234.56 EUR"
    assert line_total(0, 999) == 0
