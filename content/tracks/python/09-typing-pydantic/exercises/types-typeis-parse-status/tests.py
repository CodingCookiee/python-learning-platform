import re
from functools import cache

from plp import hidden, raises, solution_source, source_uses, test, typecheck
from solution import is_order_status, parse_statuses, status_label

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'raw = "".join(["pa", "id"])',
    'narrowed: OrderStatus = raw if is_order_status(raw) else "pending"',
    'statuses: list[OrderStatus] = parse_statuses(["paid"])',
    'label: str = status_label("shipped")',
]
REJECTED = [
    "unchecked: OrderStatus = raw",
    'status_label("delivered")',
    'parse_statuses("paid")',
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


@test("Parses, refuses and labels like the example")
def _():
    assert parse_statuses([" Paid", "SHIPPED "]) == ["paid", "shipped"]
    with raises(ValueError, match="row 3: unknown status 'lost'"):
        parse_statuses(["paid", "pending", "lost"])
    assert status_label("paid") == "Paid, not shipped"


@test("Recognises exactly the four statuses")
def _():
    assert [is_order_status(s) for s in ["pending", "paid", "shipped", "cancelled"]] == [True] * 4
    assert is_order_status("Paid") is False
    assert is_order_status("refunded") is False


@test("Labels every status, using match and assert_never")
def _():
    assert [status_label(s) for s in ["pending", "shipped", "cancelled"]] == [
        "Awaiting payment",
        "On its way",
        "Cancelled",
    ]
    assert source_uses(node="Match"), "status_label should be a match statement"
    assert source_uses(call="assert_never"), "end the match with case _: assert_never(status)"


@test("mypy --strict passes, and is_order_status narrows a str", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy rejects an unchecked str, an unknown status and a str instead of a list", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Handles an empty export and reports the first bad row")
def _():
    assert parse_statuses([]) == []
    with raises(ValueError, match="row 1: unknown status 'on hold'"):
        parse_statuses(["  On Hold ", "lost"])
