import re
from functools import cache

from plp import defined_names, hidden, raises, solution_source, test, typecheck
from solution import DHLExpress, RoyalMail, cheapest_quote

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'best: tuple[str, int] = cheapest_quote([RoyalMail(), DHLExpress()], 500, "GB")',
    'cheapest_quote((DHLExpress(),), 2000, "DE")',
]
REJECTED = [
    'cheapest_quote([LegacyCourier()], 500, "GB")',
    'cheapest_quote(["Royal Mail"], 500, "GB")',
    'cheapest_quote([RoyalMail()], 0.5, "GB")',
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


@test("Picks the cheapest carrier, like the example")
def _():
    assert cheapest_quote([RoyalMail(), DHLExpress()], 500, "GB") == ("Royal Mail", 385)
    assert cheapest_quote([RoyalMail(), DHLExpress()], 500, "DE") == ("DHL Express", 1149)


@test("Defines a Carrier protocol, and the carriers still don't inherit from it")
def _():
    assert "Carrier" in defined_names("class"), "define a class called Carrier"
    assert RoyalMail.__bases__ == (object,), "RoyalMail shouldn't inherit from anything"
    assert DHLExpress.__bases__ == (object,), "DHLExpress shouldn't inherit from anything"


@test("mypy --strict passes and accepts both carriers", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy refuses the legacy courier, a plain string and a weight in kilograms", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Ties go to the first carrier, and no carriers is an error")
def _():
    class Courier:
        def __init__(self, name: str, cents: int) -> None:
            self.name = name
            self.cents = cents

        def quote(self, weight_grams: int, country: str) -> int:
            return self.cents

    assert cheapest_quote([Courier("Swift", 500), Courier("Rapid", 500)], 100, "FR") == ("Swift", 500)
    assert cheapest_quote(iter([Courier("Solo", 700)]), 100, "FR") == ("Solo", 700)
    with raises(ValueError):
        cheapest_quote([], 100, "FR")
