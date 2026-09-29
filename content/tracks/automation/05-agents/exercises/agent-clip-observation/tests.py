from plp import hidden, test
from solution import clip

NOTE = "\n[cut: showing 2,000 of 12,345 characters. Ask for less: a narrower query or the next page.]"


@test("Cuts a long result and says so")
def _():
    text = "".join(str(n % 10) for n in range(12_345))
    assert clip(text) == text[:2000] + NOTE


@test("Short text comes back unchanged")
def _():
    assert clip("Call with Priya: wants SSO before renewal.") == "Call with Priya: wants SSO before renewal."


@test("Text of exactly the limit is unchanged")
def _():
    assert clip("a" * 2000) == "a" * 2000
    assert clip("abc", limit=3) == "abc"


@hidden("Honours a custom limit")
def _():
    assert clip("Harbour Dental renewal", limit=7) == (
        "Harbour\n[cut: showing 7 of 22 characters. Ask for less: a narrower query or the next page.]"
    )
