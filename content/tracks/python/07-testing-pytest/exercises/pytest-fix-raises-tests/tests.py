import ast
import re
from functools import cache

from plp import defined_names, hidden, pytest_run, solution_source, source_avoids, source_uses, test

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

MODULE, TEST_FILE = "wallet.py", "test_wallet.py"

CORRECT = '''
class Wallet:
    """A prepaid wallet. Balances and charges are in pence."""

    def __init__(self, balance):
        self.balance = balance

    def charge(self, amount):
        if amount <= 0:
            raise ValueError(f"amount must be > 0 (got {amount})")
        if amount > self.balance:
            raise ValueError(f"insufficient funds: balance {self.balance}, charge {amount}")
        self.balance -= amount
'''

DEDUCTS_FIRST = planted(
    """        if amount > self.balance:
            raise ValueError(f"insufficient funds: balance {self.balance}, charge {amount}")
        self.balance -= amount
""",
    """        self.balance -= amount
        if self.balance < 0:
            raise ValueError(f"insufficient funds: balance {self.balance + amount}, charge {amount}")
""",
)
OVERDRAFT_ALLOWED = planted("if amount > self.balance:", "if False:")
NEGATIVE_ALLOWED = planted("if amount <= 0:", "if amount == 0:")


@test("Your tests pass on the correct wallet.py")
def _():
    passes_on_correct()


@test("All four tests are still there")
def _():
    result = run(CORRECT)
    assert len(result.passed + result.failed) >= 4, "Keep all four tests"


@test("No try/except left: the overdraft test uses pytest.raises")
def _():
    assert source_avoids(node="Try"), (
        "Replace the try/except with pytest.raises. A try/except that swallows the error passes "
        "whether or not anything was raised."
    )


@test("Catches a refused charge that still changes the balance")
def _():
    assert catches(DEDUCTS_FIRST), (
        "A bug slipped through: a refused charge still took the money (the balance went to -400), "
        "and all your tests still passed. The balance check never runs where it is."
    )


@hidden("Catches an overdraft going through")
def _():
    assert catches(OVERDRAFT_ALLOWED), (
        "A bug slipped through: Wallet(100).charge(500) went through without an error, and all "
        "your tests still passed."
    )


@hidden("Catches a negative charge being accepted")
def _():
    assert catches(NEGATIVE_ALLOWED), (
        "A bug slipped through: charge(-5) was accepted (and added 5p to the balance), and all "
        "your tests still passed."
    )
