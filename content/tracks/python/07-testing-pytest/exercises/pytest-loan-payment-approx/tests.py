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

MODULE, TEST_FILE = "loans.py", "test_loans.py"

CORRECT = '''
def monthly_payment(principal, annual_rate, months):
    """The fixed monthly repayment on a loan, in pounds.

    annual_rate is a fraction (0.06 for 6% a year), charged monthly. With a rate
    of 0 the principal is simply split evenly over the months.
    """
    if annual_rate == 0:
        return principal / months
    monthly_rate = annual_rate / 12
    return principal * monthly_rate / (1 - (1 + monthly_rate) ** -months)
'''

ANNUAL_AS_MONTHLY = planted("monthly_rate = annual_rate / 12", "monthly_rate = annual_rate")
NO_ZERO_BRANCH = planted(
    """    if annual_rate == 0:
        return principal / months
""",
    "",
)
MONTH_SHORT = planted("** -months)", "** -(months - 1))")


@test("Your tests pass on the correct loans.py")
def _():
    passes_on_correct()


@test("Compares with pytest.approx")
def _():
    assert source_uses(name="approx"), "Compare the float results with pytest.approx"


@test("Catches the annual rate being charged every month")
def _():
    assert catches(ANNUAL_AS_MONTHLY), (
        "A bug slipped through: the yearly rate was charged every month (a 12-month loan of 10,000 "
        "at 6% cost 1,192.77 a month), and all your tests still passed. Check an exact repayment."
    )


@hidden("Catches the interest-free case dividing by zero")
def _():
    assert catches(NO_ZERO_BRANCH), (
        "A bug slipped through: an interest-free loan crashed with ZeroDivisionError, and all your "
        "tests still passed. Test a rate of 0."
    )


@hidden("Catches a repayment spread over one month too few")
def _():
    assert catches(MONTH_SHORT), (
        "A bug slipped through: the loan was spread over one month too few, and all your tests "
        "still passed. Check the exact repayment for a loan with interest."
    )
