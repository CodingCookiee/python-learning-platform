import re
from functools import cache

from plp import hidden, solution_source, test, typecheck
from solution import order_total

ORDER = {"order_id": "A1042", "lines": [{"sku": "MUG-01", "quantity": 2, "unit_price_cents": 800}]}

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'total: int = order_total({"order_id": "A1", "lines": [{"sku": "MUG-01", "quantity": 2, "unit_price_cents": 800}]})',
    'with_coupon: int = order_total({"order_id": "A2", "lines": [], "coupon": "WELCOME10"})',
    'line: LineItem = {"sku": "MUG-01", "quantity": 1, "unit_price_cents": 800}',
    'payload: OrderPayload = {"order_id": "A3", "lines": [line, line]}',
]
REJECTED = [
    'order_total({"order_id": "A1"})',
    'order_total({"order_id": "A1", "lines": [{"sku": "MUG-01", "quantity": "2", "unit_price_cents": 800}]})',
    'order_total({"order_id": "A1", "lines": [], "cupon": "WELCOME10"})',
    'order_total({"order_id": "A1", "lines": [], "coupon": None})',
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


@test("Totals an order, with and without the coupon")
def _():
    assert order_total(ORDER) == 1600
    assert order_total({**ORDER, "coupon": "WELCOME10"}) == 1440


@test("Ignores other coupons and rounds the discount down")
def _():
    assert order_total({**ORDER, "coupon": "SUMMER"}) == 1600
    odd = {"order_id": "A7", "lines": [{"sku": "PEN-01", "quantity": 1, "unit_price_cents": 1999}]}
    assert order_total({**odd, "coupon": "WELCOME10"}) == 1800


@test("mypy --strict passes and accepts well-formed payloads", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy rejects a missing key, a wrong type, a misspelled key and a None coupon", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Adds up several lines, and an empty order is free")
def _():
    lines = [
        {"sku": "MUG-01", "quantity": 2, "unit_price_cents": 800},
        {"sku": "BEANS-1KG", "quantity": 1, "unit_price_cents": 2450},
    ]
    assert order_total({"order_id": "A8", "lines": lines}) == 4050
    assert order_total({"order_id": "A9", "lines": []}) == 0
