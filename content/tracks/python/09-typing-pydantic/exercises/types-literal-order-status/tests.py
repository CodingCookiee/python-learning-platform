import re
from functools import cache

from plp import hidden, raises, solution_source, test, typecheck
from solution import next_status

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'after: OrderStatus = next_status("pending", "pay")',
    'shipped: OrderStatus = "shipped"',
    'cancel: OrderEvent = "cancel"',
]
REJECTED = [
    'next_status("delivered", "pay")',
    'next_status("pending", "refund")',
    'capitalised: OrderStatus = "Paid"',
    'label: int = next_status("paid", "ship")',
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


@test("Moves orders like the example")
def _():
    assert next_status("pending", "pay") == "paid"
    assert next_status("paid", "cancel") == "cancelled"
    with raises(ValueError, match="can't ship a pending order"):
        next_status("pending", "ship")


@test("Follows every allowed move")
def _():
    assert next_status("paid", "ship") == "shipped"
    assert next_status("pending", "cancel") == "cancelled"


@test("mypy --strict passes and accepts the literal types", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy rejects unknown statuses and events", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Refuses every move that isn't allowed")
def _():
    with raises(ValueError, match="can't cancel a shipped order"):
        next_status("shipped", "cancel")
    with raises(ValueError, match="can't pay a cancelled order"):
        next_status("cancelled", "pay")
    with raises(ValueError, match="can't pay a paid order"):
        next_status("paid", "pay")
