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

MODULE, TEST_FILE = "signup.py", "test_signup.py"

SUPPORT["mailer.py"] = '''
def send_email(to, subject, body):
    """Send an email through the company's mail server."""
    raise RuntimeError(f"tried to send a real email to {to} during a test")
'''

CORRECT = '''
from mailer import send_email


def register(email):
    """Register a customer and send them a welcome email. Returns the stored address."""
    address = email.strip().lower()
    if "@" not in address:
        raise ValueError(f"not an email address: {email!r}")
    send_email(address, "Welcome to Harbour Books", f"Hi {address}, thanks for signing up.")
    return address
'''

SENDS_BEFORE_CHECKING = planted(
    """    if "@" not in address:
        raise ValueError(f"not an email address: {email!r}")
    send_email(address, "Welcome to Harbour Books", f"Hi {address}, thanks for signing up.")
""",
    """    send_email(address, "Welcome to Harbour Books", f"Hi {address}, thanks for signing up.")
    if "@" not in address:
        raise ValueError(f"not an email address: {email!r}")
""",
)
SENDS_TO_RAW_ADDRESS = planted('send_email(address, "Welcome', 'send_email(email, "Welcome')
WRONG_SUBJECT = planted('"Welcome to Harbour Books"', '"Welcome to Harbour"')


@test("Your tests pass on the correct signup.py")
def _():
    passes_on_correct()


@test("Patches send_email in signup, where register looks it up")
def _():
    strings = [n.value for n in ast.walk(ast.parse(solution_source())) if isinstance(n, ast.Constant)]
    assert "mailer.send_email" not in strings, (
        'patch("mailer.send_email") replaces the name in mailer, but register calls the copy in '
        "signup. Patch that one."
    )
    assert len(run(CORRECT).passed) >= 3, "Keep all three tests"


@test("Catches the email going to the address as typed")
def _():
    assert catches(SENDS_TO_RAW_ADDRESS), (
        "A bug slipped through: the welcome email went to \"  Grace@Example.com \" as typed, and "
        "all your tests still passed."
    )


@hidden("Catches an email sent before the address is checked")
def _():
    assert catches(SENDS_BEFORE_CHECKING), (
        "A bug slipped through: an invalid address was sent an email before it was refused, and "
        "all your tests still passed."
    )


@hidden("Catches the wrong subject line")
def _():
    assert catches(WRONG_SUBJECT), (
        "A bug slipped through: the welcome email's subject was wrong, and all your tests still passed."
    )
