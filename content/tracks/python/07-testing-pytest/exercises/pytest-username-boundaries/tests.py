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

MODULE, TEST_FILE = "signup.py", "test_signup.py"

CORRECT = '''
import re


def is_valid_username(name):
    """True if name can be used as a username.

    A username is 3 to 15 characters long, uses only letters, digits and
    underscores, and starts with a letter.
    """
    return re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{2,14}", name) is not None
'''

ALLOWS_16 = planted("{2,14}", "{2,15}")
ALLOWS_2 = planted("{2,14}", "{1,14}")
ALLOWS_LEADING_DIGIT = planted('r"[A-Za-z][', 'r"[A-Za-z0-9][')
ALLOWS_HYPHEN = planted("[A-Za-z0-9_]{", "[A-Za-z0-9_-]{")


@test("Your tests pass on the correct signup.py")
def _():
    passes_on_correct()


@test("Catches a 16-character limit")
def _():
    assert catches(ALLOWS_16), (
        "A bug slipped through: a 16-character username was accepted, and all your tests still "
        "passed. Test the longest allowed name, and one character longer."
    )


@test("Catches a 2-character minimum")
def _():
    assert catches(ALLOWS_2), (
        "A bug slipped through: a 2-character username was accepted, and all your tests still "
        "passed. Test the shortest allowed name, and one character shorter."
    )


@hidden("Catches a username that starts with a digit")
def _():
    assert catches(ALLOWS_LEADING_DIGIT), (
        "A bug slipped through: a username starting with a digit was accepted, and all your "
        "tests still passed. Test the first-character rule on its own."
    )


@hidden("Catches a hyphen being allowed")
def _():
    assert catches(ALLOWS_HYPHEN), (
        "A bug slipped through: a hyphen was accepted in a username, and all your tests still "
        "passed. Test a name with a character that isn't a letter, digit or underscore."
    )
