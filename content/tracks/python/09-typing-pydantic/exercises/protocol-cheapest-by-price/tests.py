import re
from functools import cache

from plp import hidden, raises, solution_source, test, typecheck
from solution import GiftCard, Product, ShippingOption, cheapest, total_price

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'mug: Product = cheapest([Product("Mug", 800), Product("Beans", 2450)])',
    'option: ShippingOption = cheapest([ShippingOption("Standard", 399, 0)])',
    'card: GiftCard = cheapest([GiftCard("GC-1", 2500)])',
    'total: int = total_price([Product("Mug", 800), ShippingOption("Next day", 599, 200), GiftCard("GC-1", 2500)])',
]
REJECTED = [
    "cheapest([800, 2450])",
    'wrong: Product = cheapest([ShippingOption("Standard", 399, 0)])',
    'total_price(["Mug"])',
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


@test("Finds the cheapest and adds up prices, like the example")
def _():
    assert cheapest([Product("Mug", 800), Product("Beans", 2450)]) == Product("Mug", 800)
    options = [ShippingOption("Next day", 599, 200), ShippingOption("Standard", 399, 0)]
    assert cheapest(options).label == "Standard"
    everything = [Product("Mug", 800), ShippingOption("Next day", 599, 200), GiftCard("GC-1", 2500)]
    assert total_price(everything) == 4099


@test("Ties go to the first item, and nothing to compare is an error")
def _():
    assert cheapest([GiftCard("GC-1", 500), GiftCard("GC-2", 500)]).code == "GC-1"
    with raises(ValueError, match="nothing to compare"):
        cheapest([])


@test("mypy --strict passes, and cheapest keeps the item's own type", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy rejects things without a price, and the wrong result type", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Works on generators, and an empty total is 0")
def _():
    assert cheapest(Product(f"P{n}", 1000 - n) for n in range(3)).name == "P2"
    assert total_price([]) == 0
    assert total_price(GiftCard(f"GC-{n}", 100) for n in range(4)) == 400
