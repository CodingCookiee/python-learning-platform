import re
from functools import cache

from plp import defined_names, hidden, raises, solution_source, source_avoids, test, typecheck
from solution import PayFastClient, checkout

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'receipt: str = checkout(PayFastClient(), "A1042", 1600)',
]
REJECTED = [
    'checkout("payfast", "A1042", 1600)',
    'checkout(PayFastClient(), "A1042", "16.00")',
    'checkout(object(), "A1042", 1600)',
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


@test("mypy accepts PayFastClient as a gateway, and it works", timeout=None)
def _():
    problems = mypy_report()["accepted"]
    assert problems == [], "mypy rejects correct code:\n" + "\n".join(problems)
    assert checkout(PayFastClient(), "A1042", 1600) == "pf_A1042_1600"


@test("The adapter and the ABC are gone")
def _():
    assert "PayFastAdapter" not in defined_names("class"), "delete PayFastAdapter"
    assert source_avoids(name="ABC"), "PaymentGateway should be a Protocol, not an ABC"
    assert source_avoids(name="abstractmethod"), "a Protocol doesn't need abstractmethod"


@test("mypy --strict passes", timeout=None)
def _():
    problems = mypy_report()["own"]
    assert problems == [], "mypy --strict reports:\n" + "\n".join(problems)


@test("mypy still rejects things that aren't gateways, and a bad amount", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Any object with a charge method works, and bad amounts are still refused")
def _():
    class FakeGateway:
        def __init__(self) -> None:
            self.charged: list[tuple[str, int]] = []

        def charge(self, order_id: str, amount_cents: int) -> str:
            self.charged.append((order_id, amount_cents))
            return "fake_1"

    fake = FakeGateway()
    assert checkout(fake, "A7", 250) == "fake_1"
    assert fake.charged == [("A7", 250)]
    with raises(ValueError, match="positive"):
        checkout(fake, "A8", 0)
