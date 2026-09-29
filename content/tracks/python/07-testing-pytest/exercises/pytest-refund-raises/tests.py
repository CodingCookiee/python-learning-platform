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

MODULE, TEST_FILE = "refunds.py", "test_refunds.py"

CORRECT = '''
def refund(paid_pence, amount_pence):
    """Refund part or all of an order, and return what's left of the payment, in pence.

    Raises ValueError if the amount isn't positive, or is more than was paid.
    """
    if amount_pence <= 0:
        raise ValueError(f"refund must be positive, got {amount_pence}")
    if amount_pence > paid_pence:
        raise ValueError(f"can't refund {amount_pence}p of a {paid_pence}p order")
    return paid_pence - amount_pence
'''

ZERO_ALLOWED = planted("if amount_pence <= 0:", "if amount_pence < 0:")
NO_LIMIT = planted("if amount_pence > paid_pence:", "if False:")
FULL_REFUND_REFUSED = planted("if amount_pence > paid_pence:", "if amount_pence >= paid_pence:")


@test("Your tests pass on the correct refunds.py")
def _():
    passes_on_correct()


@test("Uses pytest.raises")
def _():
    assert source_uses(name="raises"), "Check the refused refunds with pytest.raises(ValueError)"


@test("Catches a refund larger than the order being paid out")
def _():
    assert catches(NO_LIMIT), (
        "A bug slipped through: refund(2000, 5000) returned -3000 instead of raising ValueError, "
        "and all your tests still passed."
    )


@hidden("Catches a refund of zero being accepted")
def _():
    assert catches(ZERO_ALLOWED), (
        "A bug slipped through: refund(2000, 0) was accepted, and all your tests still passed. "
        "Zero is the edge of \"must be positive\"."
    )


@hidden("Catches a full refund being refused")
def _():
    assert catches(FULL_REFUND_REFUSED), (
        "A bug slipped through: refunding exactly what was paid raised ValueError, and all your "
        "tests still passed. Test the edge of the limit from the allowed side too."
    )
