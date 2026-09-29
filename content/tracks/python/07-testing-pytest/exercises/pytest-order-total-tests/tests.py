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

MODULE, TEST_FILE = "orders.py", "test_orders.py"

CORRECT = '''
def order_total(lines):
    """The total of an order in pence.

    lines is a list of (sku, quantity, unit_price_pence) tuples.
    """
    return sum(quantity * unit_price for sku, quantity, unit_price in lines)
'''

IGNORES_QUANTITY = planted("sum(quantity * unit_price", "sum(unit_price")
SKIPS_LAST_LINE = planted("in lines)", "in lines[:-1])")


@test("Your tests pass on the correct orders.py")
def _():
    passes_on_correct()


@test("You added tests of your own")
def _():
    assert len(run(CORRECT).passed) >= 2, "Add at least one test of your own to the one in the starter"


@test("Catches a total that ignores the quantity")
def _():
    assert catches(IGNORES_QUANTITY), (
        "A bug slipped through: order_total added up the unit prices and ignored the quantities, "
        "and all your tests still passed. Test a line with a quantity above 1."
    )


@hidden("Catches a total that leaves out the last line")
def _():
    assert catches(SKIPS_LAST_LINE), (
        "A bug slipped through: order_total left the last line out of the total, and all your "
        "tests still passed. Test an order with more than one line."
    )
