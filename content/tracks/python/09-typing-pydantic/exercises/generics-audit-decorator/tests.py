import re
from functools import cache

from plp import hidden, solution_source, test, typecheck
from solution import AUDIT_LOG, audited, refund

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'ok: bool = refund("A1042", 1600)',
    'damaged: bool = refund("A1043", 500, reason="damaged")',
]
REJECTED = [
    'refund("A1042", "16.00")',
    'refund("A1042")',
    'refund("A1042", 500, "damaged")',
    'wrong: str = refund("A1042", 1)',
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


@test("Records each call and returns the result")
def _():
    AUDIT_LOG.clear()
    assert refund("A1042", 1600) is True
    assert refund("A1043", 500, reason="damaged") is True
    assert AUDIT_LOG == ["refund('A1042', 1600)", "refund('A1043', 500, reason='damaged')"]


@test("Keeps the function's name and docstring")
def _():
    assert refund.__name__ == "refund"
    assert refund.__doc__ == "Refund part or all of an order."


@test("mypy --strict passes and accepts correct calls", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy still checks calls through the decorator", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Works on any function, and logs before calling it")
def _():
    AUDIT_LOG.clear()

    @audited
    def cancel_order(order_id: str) -> None:
        assert AUDIT_LOG == ["cancel_order('A7')"], "the call should be logged before the function runs"
        raise RuntimeError("payment provider down")

    try:
        cancel_order("A7")
    except RuntimeError:
        pass
    assert AUDIT_LOG == ["cancel_order('A7')"]
    assert refund("A8", 0) is False
