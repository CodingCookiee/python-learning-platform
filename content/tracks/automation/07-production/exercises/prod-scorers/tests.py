from plp import hidden, test
from solution import Score, contains, exact, matches, within


@test("contains passes and fails like the example")
def _():
    assert contains("Refunds reach your card within 14 days.", ["14 days", "card"]) == Score(True, "ok")
    assert contains("Refunds take a while.", ["14 days", "card"]) == Score(False, "missing '14 days', 'card'")


@test("within finds the first number, commas and all")
def _():
    assert within("The total is €1,240.50", 1240.5) == Score(True, "ok")
    assert within("Total 1240.49", 1240.5).passed is True
    assert within("Total 1240.40", 1240.5).passed is False
    assert within("Total 1240.40", 1240.5, tolerance=0.5).passed is True


@test("exact ignores case, spacing and a trailing full stop")
def _():
    assert exact("  Billing.\n", "billing") == Score(True, "ok")
    assert exact("Billing query", "billing").passed is False


@test("contains accepts a single phrase and normalises spacing")
def _():
    assert contains("Order  1042 ships\nTODAY", "ships today").passed is True
    assert contains("Your order ships tomorrow", "ships today") == Score(False, "missing 'ships today'")


@test("matches searches anywhere in the output")
def _():
    assert matches("Your order is SO-1042.", r"SO-\d{4}\b") == Score(True, "ok")
    result = matches("Your order is on its way", r"SO-\d{4}\b")
    assert result.passed is False
    assert result.reason != "ok"


@hidden("within explains a missing number and a wrong one")
def _():
    missing = within("I couldn't find a total", 1240.5)
    assert missing.passed is False
    assert "number" in missing.reason
    wrong = within("Subtotal 1,200.00, total 1,240.50", 1240.5)
    assert wrong.passed is False
    assert "1200" in wrong.reason


@hidden("Negative numbers and whole numbers work")
def _():
    assert within("Credit note: -45.00 EUR", -45).passed is True
    assert within("3 items", 3, tolerance=0).passed is True
    assert exact("", "").passed is True
