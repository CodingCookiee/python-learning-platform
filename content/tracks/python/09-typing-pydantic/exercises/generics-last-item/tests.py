import re
from functools import cache

from plp import hidden, raises, solution_source, test, typecheck
from solution import last

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    "cents: int = last([1600, 900, 2450])",
    'sku: str = last(("MUG-01", "BEANS-1KG"))',
    'letter: str = last("ABC")',
]
REJECTED = [
    "wrong: str = last([1600, 900])",
    "last(2450)",
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


@test("Returns the last item, and refuses an empty sequence")
def _():
    assert last([1600, 900, 2450]) == 2450
    assert last(("MUG-01", "BEANS-1KG")) == "BEANS-1KG"
    with raises(IndexError, match="no items"):
        last([])


@test("mypy --strict passes, and the result keeps the item type", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy rejects the wrong result type, and a value that isn't a sequence", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Works on strings and one-item sequences")
def _():
    assert last("ABC") == "C"
    assert last([7]) == 7
    with raises(IndexError, match="no items"):
        last("")
