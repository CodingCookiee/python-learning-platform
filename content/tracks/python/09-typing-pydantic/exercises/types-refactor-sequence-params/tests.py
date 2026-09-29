import re
from functools import cache

from plp import hidden, solution_source, test, typecheck
from solution import average_order_value, revenue_by_region, total_revenue

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    "average_order_value((19.99, 5.0))",
    "whole: list[int] = [1999, 2500]",
    "average_order_value(whole)",
    "total_revenue(t for t in [12.5, 7.5])",
    "total_revenue({12.5, 7.5})",
    'revenue_by_region({"EU": (10.0, 5.5), "US": [3.0]})',
    'report: dict[str, float] = revenue_by_region({"EU": [1.0]})',
]
REJECTED = [
    'total_revenue(["19.99"])',
    "average_order_value(t for t in [1.0])",
    'revenue_by_region({"EU": 10.0})',
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


@test("mypy accepts tuples, generators, sets and whole-number totals", timeout=None)
def _():
    problems = mypy_report()["accepted"]
    assert problems == [], "mypy rejects correct code:\n" + "\n".join(problems)


@test("mypy --strict passes", timeout=None)
def _():
    problems = mypy_report()["own"]
    assert problems == [], "mypy --strict reports:\n" + "\n".join(problems)


@test("mypy still rejects strings, and a generator where a length is needed", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@test("The functions still work on those inputs")
def _():
    assert average_order_value((19.5, 5.5)) == 12.5
    assert average_order_value([1999, 2501]) == 2250
    assert total_revenue(t for t in [12.5, 7.5]) == 20.0
    assert revenue_by_region({"EU": (10.0, 5.5), "US": [3.0]}) == {"EU": 15.5, "US": 3.0}


@hidden("Returns plain dicts and floats")
def _():
    assert type(revenue_by_region({"EU": [1.0]})) is dict
    assert total_revenue({2.5, 7.5}) == 10.0
    assert revenue_by_region({}) == {}
