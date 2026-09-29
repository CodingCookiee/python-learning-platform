import ast
import re
from functools import cache

import plp
from plp import defined_names, pytest_run, solution_source, source_avoids, source_uses


# Each check runs pytest, which takes a few seconds (the first run imports it). The per-test
# limit only watches tests.py itself here, so it's switched off; the drill's timeout still applies.
def test(name):
    return plp.test(name, timeout=None)


def hidden(name):
    return plp.hidden(name, timeout=None)


SUPPORT = {}  # extra files pytest needs (a conftest.py, other modules)


@cache
def run(module_source):
    """Run the learner's tests with pytest against one version of the module under test."""
    return pytest_run({**SUPPORT, MODULE: module_source, TEST_FILE: solution_source()})


def planted(old, new, source=None):
    """A copy of the correct module with one bug planted in it."""
    source = CORRECT if source is None else source
    assert old in source, f"mutant doesn't apply: {old!r}"
    return source.replace(old, new)


def report(result):
    """pytest's own explanation of each failure: the E lines under each test's heading."""
    out, heading, shown = [], None, 0
    for line in result.output.splitlines():
        match = re.fullmatch(r"_{2,} (.+?) _{2,}", line)
        if match:
            heading, shown = match.group(1), 0
        elif line.startswith("E ") and heading and shown < 3:
            if shown == 0:
                out.append(heading + ":")
            out.append("    " + line[1:].strip().removeprefix("AssertionError: "))
            shown += 1
        elif "short test summary" in line:
            break
    return "\n".join(out[:15])


def clean(result):
    return result.total > 0 and not result.failed and not result.errors


def catches(buggy_source):
    """True if the learner's tests fail (or error) on the buggy copy."""
    assert clean(run(CORRECT)), "Make your tests pass cleanly on the correct code first (see the checks above)"
    result = run(buggy_source)
    return bool(result.failed or result.errors)


def passes_on_correct():
    result = run(CORRECT)
    assert result.total > 0, "pytest didn't collect any tests. Name each test function test_something."
    assert result.errors == [], "pytest couldn't run some of your tests:\n" + report(result)
    assert result.failed == [], (
        "These fail on the correct code, so they expect the wrong thing:\n" + report(result)
    )

MODULE, TEST_FILE = "invoice.py", "test_invoice.py"

CORRECT = '''
from decimal import ROUND_HALF_UP, Decimal

VAT_RATE = Decimal("0.20")
PENNY = Decimal("0.01")


def invoice_total(lines, discount_percent=0):
    """Totals for an invoice (see the prompt)."""
    subtotal = sum((quantity * price for _, quantity, price in lines), Decimal("0"))
    discount = (subtotal * discount_percent / 100).quantize(PENNY, rounding=ROUND_HALF_UP)
    vat = ((subtotal - discount) * VAT_RATE).quantize(PENNY, rounding=ROUND_HALF_UP)
    return {"subtotal": subtotal, "discount": discount, "vat": vat, "total": subtotal - discount + vat}
'''

VAT_BEFORE_DISCOUNT = planted("vat = ((subtotal - discount) * VAT_RATE)", "vat = (subtotal * VAT_RATE)")
IGNORES_QUANTITY = planted("sum((quantity * price for", "sum((price for")
DISCOUNT_ROUNDS_DOWN = planted(
    "discount = (subtotal * discount_percent / 100).quantize(PENNY, rounding=ROUND_HALF_UP)",
    "discount = (subtotal * discount_percent / 100).quantize(PENNY, rounding=ROUND_DOWN)",
).replace("import ROUND_HALF_UP,", "import ROUND_DOWN, ROUND_HALF_UP,")


@test("Your tests pass on the refactored invoice.py")
def _():
    passes_on_correct()


@test("No mocks or patching: invoice_total is called for real")
def _():
    assert source_avoids(name="patch"), "Remove the patching: call invoice_total for real and check its result"
    assert source_avoids(name="Mock") and source_avoids(name="MagicMock"), "invoice_total is pure, so there's nothing to mock"


@test("Catches VAT charged before the discount")
def _():
    assert catches(VAT_BEFORE_DISCOUNT), (
        "A bug slipped through: VAT was charged on the subtotal before the discount (a 100.00 desk "
        "at 10% off came to 110.00), and all your tests still passed. Check the VAT and the total."
    )


@hidden("Catches quantities being ignored")
def _():
    assert catches(IGNORES_QUANTITY), (
        "A bug slipped through: the subtotal ignored quantities, and all your tests still passed. "
        "Use a line with a quantity above 1."
    )


@hidden("Catches the discount being rounded down")
def _():
    assert catches(DISCOUNT_ROUNDS_DOWN), (
        "A bug slipped through: the discount was rounded down instead of half-up, and all your "
        "tests still passed. Try a discount that isn't a whole number of pence, like 15% of 19.99."
    )
