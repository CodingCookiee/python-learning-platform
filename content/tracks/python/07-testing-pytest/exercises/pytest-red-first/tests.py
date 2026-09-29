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

MODULE, TEST_FILE = "coupons.py", "test_coupons.py"

BUGGY = '''
COUPONS = {"SAVE10": 10, "SPRING25": 25}


def discount_percent(code):
    """The percentage off for a coupon code, or 0 if the code isn't valid.

    Codes aren't case-sensitive, and spaces around them are ignored.
    """
    return COUPONS.get(code.strip(), 0)
'''

# The fix: the code the learner's tests are graded against once the bug is gone
CORRECT = planted("COUPONS.get(code.strip(), 0)", "COUPONS.get(code.strip().upper(), 0)", source=BUGGY)

CRASHES_ON_UNKNOWN_CODES = planted("COUPONS.get(code.strip().upper(), 0)", "COUPONS[code.strip().upper()]")
STOPS_IGNORING_SPACES = planted("COUPONS.get(code.strip().upper(), 0)", "COUPONS.get(code.upper(), 0)")


@test("Red: a test fails on the current, buggy code")
def _():
    result = run(BUGGY)
    assert result.total > 0, "pytest didn't collect any tests. Name each test function test_something."
    assert result.failed or result.errors, (
        "All your tests pass on the current code, which still has the bug, so none of them "
        "reproduces it. Do what the customer did."
    )


@test("Green: every test passes once the bug is fixed")
def _():
    passes_on_correct()


@test("Catches a fix that crashes on unknown codes")
def _():
    assert catches(CRASHES_ON_UNKNOWN_CODES), (
        "A bug slipped through: a fix that looked codes up with COUPONS[...] made unknown codes "
        "raise KeyError instead of giving 0, and all your tests still passed."
    )


@hidden("Catches a fix that stops ignoring spaces")
def _():
    assert catches(STOPS_IGNORING_SPACES), (
        "A bug slipped through: a fix that dropped .strip() made \" save10 \" invalid, and all "
        "your tests still passed. The docstring promises spaces are ignored."
    )
