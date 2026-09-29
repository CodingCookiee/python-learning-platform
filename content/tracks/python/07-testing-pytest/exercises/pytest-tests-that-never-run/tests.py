import re
from functools import cache

from plp import hidden, pytest_run, solution_source, test

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
    out, shown = [], 0
    for line in result.output.splitlines():
        heading = re.fullmatch(r"_{2,} (.+?) _{2,}", line)
        if heading:
            out.append(heading.group(1) + ":")
            shown = 0
        elif line.startswith("E ") and out and shown < 3:
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

MODULE, TEST_FILE = "refunds.py", "test_refunds.py"

CORRECT = '''
def refund_amount(paid_pence, days_since_purchase):
    """How much of a purchase to refund, in pence.

    A full refund up to and including day 14, half (rounded down to the penny)
    up to and including day 30, and nothing after that.
    """
    if days_since_purchase <= 14:
        return paid_pence
    if days_since_purchase <= 30:
        return paid_pence // 2
    return 0
'''

FULL_ONLY_TO_DAY_13 = planted("<= 14", "< 14")
HALF_REFUND_IS_FULL = planted("return paid_pence // 2", "return paid_pence")
LATE_REFUND_IS_HALF = planted("<= 30", "<= 60")


@test("Your tests pass on the correct refunds.py")
def _():
    passes_on_correct()


@test("pytest collects all four tests")
def _():
    ran = run(CORRECT).passed + run(CORRECT).failed
    assert len(ran) >= 4, (
        f"pytest ran {len(ran)} test(s): {', '.join(ran) or 'none'}. "
        "Two of the four aren't being collected."
    )


@test("The day-14 test can fail")
def _():
    assert catches(FULL_ONLY_TO_DAY_13), (
        "A bug slipped through: day 14 got only a half refund, and every test still passed. "
        "The day-14 test computes the refund but never checks it."
    )


@hidden("The half-refund test runs and can fail")
def _():
    assert catches(HALF_REFUND_IS_FULL), (
        "A bug slipped through: day 20 got a full refund instead of half, and every test still "
        "passed. Is the half-refund test being collected?"
    )


@hidden("The after-a-month test can fail")
def _():
    assert catches(LATE_REFUND_IS_HALF), (
        "A bug slipped through: day 45 still got a half refund, and every test still passed. "
        "A test that returns its comparison instead of asserting it always passes."
    )
