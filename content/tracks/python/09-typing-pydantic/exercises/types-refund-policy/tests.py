import re
from functools import cache

from plp import hidden, raises, solution_source, test, typecheck
from solution import RETURN_WINDOW_DAYS, refund_cents

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    "full: int = refund_cents(1999, 3)",
    "half: int = refund_cents(1999, 45, damaged=True)",
    "window: int = RETURN_WINDOW_DAYS + 1",
]
REJECTED = [
    'refund_cents(1999, "3")',
    "refund_cents(19.99, 3)",
    "refund_cents(1999, 45, True)",
    "global RETURN_WINDOW_DAYS; RETURN_WINDOW_DAYS = 60",
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


@test("Refunds by the rule in the example")
def _():
    assert refund_cents(1999, 3) == 1999
    assert refund_cents(1999, 45) == 0
    assert refund_cents(1999, 45, damaged=True) == 999


@test("The window ends after day 30")
def _():
    assert RETURN_WINDOW_DAYS == 30
    assert refund_cents(5000, 30) == 5000
    assert refund_cents(5000, 31) == 0
    assert refund_cents(5000, 0, damaged=True) == 5000


@test("mypy --strict passes and accepts correct calls", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy rejects wrong types, a positional damaged flag and a reassigned window", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Refuses negative days and rounds half down")
def _():
    with raises(ValueError):
        refund_cents(1000, -1)
    assert refund_cents(1001, 90, damaged=True) == 500
    assert refund_cents(1, 31, damaged=True) == 0
