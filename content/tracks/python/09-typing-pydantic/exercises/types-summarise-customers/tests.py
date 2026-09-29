import re
from functools import cache

from plp import hidden, solution_source, test, typecheck
from solution import summarise

ROWS = [
    {"order_id": "A1", "customer": "ada@example.com", "total_cents": 1600, "placed_on": "2026-09-01"},
    {"order_id": "A2", "customer": "grace@example.com", "total_cents": 4200, "placed_on": "2026-09-03"},
    {"order_id": "A3", "customer": " Ada@Example.com", "total_cents": 900, "placed_on": "2026-09-14"},
]

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    "summary = summarise([])",
    'count: int = summary["ada@example.com"]["orders"]',
    'last: str = summary["ada@example.com"]["last_order"]',
    "summarise(row for row in [])",
    'summarise(({"order_id": "A1", "customer": "ada", "total_cents": 1, "placed_on": "2026-09-01"},))',
]
REJECTED = [
    'summary["ada@example.com"]["total"]',
    'spent: str = summary["ada@example.com"]["spent_cents"]',
    'summarise([{"order_id": "A1", "customer": "ada", "total_cents": "1999", "placed_on": "2026-09-01"}])',
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


@test("Summarises the example rows")
def _():
    assert summarise(ROWS) == {
        "grace@example.com": {"orders": 1, "spent_cents": 4200, "last_order": "2026-09-03"},
        "ada@example.com": {"orders": 2, "spent_cents": 2500, "last_order": "2026-09-14"},
    }


@test("Orders the result biggest spender first, ties by email")
def _():
    rows = ROWS + [
        {"order_id": "A4", "customer": "alan@example.com", "total_cents": 2500, "placed_on": "2026-08-30"},
    ]
    assert list(summarise(rows)) == ["grace@example.com", "ada@example.com", "alan@example.com"]


@test("Reads rows from a generator, and keeps the latest date whatever the order")
def _():
    rows = (row for row in reversed(ROWS))
    assert summarise(rows)["ada@example.com"]["last_order"] == "2026-09-14"
    assert summarise([]) == {}


@test("mypy --strict passes and accepts correct uses", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy rejects a misspelled key, a wrong type and a string total", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)
