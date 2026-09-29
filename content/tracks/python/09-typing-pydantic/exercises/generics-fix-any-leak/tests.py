import re
from functools import cache

from plp import hidden, raises, solution_source, source_avoids, test, typecheck
from solution import Order, index_by

ORDERS = [
    Order("A1042", "ada@example.com", 1600),
    Order("A1043", "grace@example.com", 900),
]

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'orders = [Order("A1042", "ada@example.com", 1600)]',
    "by_id: dict[str, Order] = index_by(orders, lambda order: order.order_id)",
    'cents: int = index_by(orders, lambda order: order.order_id)["A1042"].total_cents',
    "by_total: dict[int, Order] = index_by(orders, lambda order: order.total_cents)",
    'skus: dict[str, str] = index_by(["MUG-01"], lambda sku: sku.lower())',
]
REJECTED = [
    'index_by(orders, lambda order: order.order_id)["A1042"].totl',
    'name: str = index_by(orders, lambda order: order.order_id)["A1042"]',
    "index_by(orders, lambda order: order.email)",
    "wrong_keys: dict[int, Order] = index_by(orders, lambda order: order.order_id)",
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


@test("mypy catches the typo from the example", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@test("mypy --strict passes and accepts correct uses", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("No Any is left")
def _():
    assert source_avoids(name="Any"), "Any is still in the file"


@test("Still indexes orders, and refuses a duplicate key")
def _():
    assert index_by(ORDERS, lambda order: order.order_id) == {"A1042": ORDERS[0], "A1043": ORDERS[1]}
    with raises(ValueError, match="duplicate key: 'ada@example.com'"):
        index_by(ORDERS + [Order("A1044", "ada@example.com", 50)], lambda order: order.customer)


@hidden("Works with any items and keys")
def _():
    assert index_by(["MUG-01", "BEANS-1KG"], len) == {6: "MUG-01", 9: "BEANS-1KG"}
    assert index_by([], len) == {}
