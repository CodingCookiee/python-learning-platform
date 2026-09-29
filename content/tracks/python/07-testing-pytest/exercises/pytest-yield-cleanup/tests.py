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


def fixture_usage():
    """The fixtures the learner defines, and the parameters each test function takes."""
    fixtures, tests = {}, {}
    for node in ast.walk(ast.parse(solution_source())):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            decorators = [ast.unparse(d) for d in node.decorator_list]
            params = [a.arg for a in node.args.args if a.arg != "self"]
            if any("fixture" in d for d in decorators):
                fixtures[node.name] = " ".join(decorators)
            elif node.name.startswith("test"):
                tests[node.name] = params
    return fixtures, tests

MODULE, TEST_FILE = "accounts.py", "test_accounts.py"

# Checks the shared database after every test (autouse fixtures are torn down last)
SUPPORT["conftest.py"] = '''
import pytest

import accounts


@pytest.fixture(autouse=True)
def _database_is_left_clean():
    yield
    left = [row.email for row in accounts.all_accounts()]
    accounts._rows.clear()
    if left:
        pytest.fail("left in the database: " + ", ".join(left), pytrace=False)
'''

CORRECT = '''
from dataclasses import dataclass
from itertools import count

PLANS = ("free", "pro", "team")

_rows = {}  # the shared database: account id -> Account
_ids = count(1)


@dataclass
class Account:
    id: int
    email: str
    plan: str = "free"


def create_account(email, plan="free"):
    """Register an account. The email is stored trimmed and lowercased, and must be unique."""
    email = email.strip().lower()
    if any(row.email == email for row in _rows.values()):
        raise ValueError(f"{email} is already registered")
    if plan not in PLANS:
        raise ValueError(f"unknown plan: {plan}")
    account = Account(next(_ids), email, plan)
    _rows[account.id] = account
    return account


def find(email):
    """The account registered with this email (typed any way), or None."""
    email = email.strip().lower()
    return next((row for row in _rows.values() if row.email == email), None)


def change_plan(account_id, plan):
    if plan not in PLANS:
        raise ValueError(f"unknown plan: {plan}")
    _rows[account_id].plan = plan


def delete_account(account_id):
    del _rows[account_id]


def all_accounts():
    return list(_rows.values())
'''

EMAIL_NOT_CLEANED = planted(
    "    email = email.strip().lower()\n    if any(",
    "    if any(",
)
FIND_CASE_SENSITIVE = planted(
    "    email = email.strip().lower()\n    return next(",
    "    return next(",
)
PLAN_NOT_STORED = planted(
    "_rows[account_id].plan = plan",
    "Account(account_id, _rows[account_id].email, plan)",
)


def fixture_body(name):
    return next(
        node
        for node in ast.walk(ast.parse(solution_source()))
        if isinstance(node, ast.FunctionDef) and node.name == name
    )


@test("Your tests pass on the correct accounts.py")
def _():
    result = run(CORRECT)
    assert result.total > 0, "pytest didn't collect any tests. Name each test function test_something."
    assert result.failed == [], (
        "These fail on the correct code, so they expect the wrong thing:\n" + report(result)
    )


@test("Every account a test creates is deleted afterwards")
def _():
    result = run(CORRECT)
    broken = [name for name in result.errors if name.startswith("collecting")]
    assert broken == [], "pytest couldn't load your test file:\n" + report(result)
    assert result.errors == [], (
        "These tests left accounts behind in the shared database: " + ", ".join(result.errors)
        + ". Delete the account in the fixture, after the yield."
    )


@test("The account fixture uses yield")
def _():
    fixtures, tests = fixture_usage()
    assert "account" in fixtures, "Keep the fixture called account"
    body = fixture_body("account")
    assert any(isinstance(node, ast.Yield) for node in ast.walk(body)), (
        "Write the account fixture with yield, and clean up after it"
    )


@test("Catches emails stored exactly as typed")
def _():
    assert catches(EMAIL_NOT_CLEANED), (
        'A bug slipped through: create_account stored "  Grace@Example.COM " exactly as typed, '
        "and all your tests still passed. Create an account with capitals and spaces and check its email."
    )


@hidden("Catches find() only matching the exact email")
def _():
    assert catches(FIND_CASE_SENSITIVE), (
        "A bug slipped through: find() only found an account when the email was typed exactly as "
        "stored, and all your tests still passed."
    )


@hidden("Catches a plan change that isn't saved")
def _():
    assert catches(PLAN_NOT_STORED), (
        "A bug slipped through: change_plan() didn't change the stored account, and all your tests "
        "still passed. Look the account up again after changing its plan."
    )
