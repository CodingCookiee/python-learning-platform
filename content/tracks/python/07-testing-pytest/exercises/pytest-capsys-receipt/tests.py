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

MODULE, TEST_FILE = "receipt.py", "test_receipt.py"

CORRECT = '''
from decimal import Decimal


def print_receipt(lines):
    """Print a receipt for (name, quantity, unit_price) lines, with Decimal prices.

    Each line shows the quantity, the name and the line total, and the last line
    is the total. An empty receipt prints just "No items".
    """
    if not lines:
        print("No items")
        return
    total = Decimal("0")
    for name, quantity, unit_price in lines:
        line_total = quantity * unit_price
        total += line_total
        print(f"{quantity} x {name:<16}{line_total:>8.2f}")
    print(f"Total: {total:.2f}")
'''

TOTAL_OVERWRITTEN = planted("total += line_total", "total = line_total")
LINE_SHOWS_UNIT_PRICE = planted("{line_total:>8.2f}", "{unit_price:>8.2f}")
EMPTY_PRINTS_NOTHING = planted('        print("No items")\n', "")


@test("Your tests pass on the correct receipt.py")
def _():
    passes_on_correct()


@test("Uses capsys")
def _():
    assert source_uses(name="capsys"), "Read what was printed with the capsys fixture"


@test("Catches a total that only counts the last line")
def _():
    assert catches(TOTAL_OVERWRITTEN), (
        "A bug slipped through: the total line showed only the last item (Total: 3.50 instead of "
        "19.50), and all your tests still passed. Check the total of a receipt with two items."
    )


@hidden("Catches item lines showing the unit price")
def _():
    assert catches(LINE_SHOWS_UNIT_PRICE), (
        "A bug slipped through: each item line showed the unit price instead of the line total, "
        "and all your tests still passed. Check an item line with a quantity above 1."
    )


@hidden("Catches an empty receipt printing nothing")
def _():
    assert catches(EMPTY_PRINTS_NOTHING), (
        "A bug slipped through: an empty receipt printed nothing instead of \"No items\", and all "
        "your tests still passed."
    )
