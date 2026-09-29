import re
from functools import cache

from plp import hidden, solution_source, test, typecheck
from solution import Page, collect_all

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'page = Page(["A1042", "A1043"], next_cursor="c2")',
    "ids: Page[str] = page",
    "lengths: Page[int] = page.map(len)",
    "maybe: str | None = page.first()",
    "more: bool = page.has_more",
    'everything: list[str] = collect_all([page, Page(["A1044"])])',
]
REJECTED = [
    'wrong: Page[int] = Page(["A1042"])',
    "sure: str = page.first()",
    "page.map(lambda order_id: order_id + 1)",
    "mixed: list[int] = collect_all([page])",
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


@test("Works like the example")
def _():
    page = Page(["A1042", "A1043"], next_cursor="c2")
    assert page.has_more is True
    assert page.first() == "A1042"
    assert page.map(len) == Page([5, 5], next_cursor="c2")
    assert collect_all([page, Page(["A1044"])]) == ["A1042", "A1043", "A1044"]


@test("The last page and an empty page")
def _():
    last = Page([7, 8])
    assert last.has_more is False
    assert Page([]).first() is None
    assert Page([], "c9").map(str) == Page([], "c9")


@test("mypy --strict passes and follows the item type", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy rejects mismatched item types, and a first() that might be None", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("collect_all reads any iterable of pages, and has_more is read-only")
def _():
    pages = (Page([n], f"c{n}") for n in range(3))
    assert collect_all(pages) == [0, 1, 2]
    assert collect_all([]) == []
    page = Page(["A1"], "c2")
    try:
        page.has_more = False
    except AttributeError:
        return
    raise AssertionError("page.has_more = False should raise AttributeError")
