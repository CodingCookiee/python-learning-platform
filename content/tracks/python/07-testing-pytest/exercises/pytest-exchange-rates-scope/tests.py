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

import sys
import types

MODULE, TEST_FILE = "rates.py", "test_rates.py"

CORRECT = '''
from decimal import ROUND_HALF_UP, Decimal

import rate_feed  # the provider's client


def load_rates():
    """Download today's rates: how many units of each currency one euro buys."""
    return {code: Decimal(rate) for code, rate in rate_feed.download().items()}


def convert(amount, source, target, rates):
    """Convert a Decimal amount between currencies, rounded half-up to the cent."""
    euros = amount / rates[source]
    return (euros * rates[target]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
'''

ROUNDS_DOWN = planted(
    "rounding=ROUND_HALF_UP)", "rounding=ROUND_DOWN)"
).replace("import ROUND_HALF_UP,", "import ROUND_DOWN, ROUND_HALF_UP,")
WRONG_WAY_ROUND = planted(
    "euros = amount / rates[source]\n    return (euros * rates[target])",
    "euros = amount * rates[source]\n    return (euros / rates[target])",
)
WHOLE_UNITS = planted('quantize(Decimal("0.01")', 'quantize(Decimal("1")')

# The provider's client: counts downloads, so the grader can see how often the fixture ran
feed = types.ModuleType("rate_feed")
feed.downloads = 0


def _download():
    feed.downloads += 1
    return {"EUR": "1", "GBP": "0.85", "USD": "1.085", "JPY": "162.40"}


feed.download = _download
sys.modules["rate_feed"] = feed
DOWNLOADS = {}


@cache
def run(module_source):
    feed.downloads = 0
    result = pytest_run({MODULE: module_source, TEST_FILE: solution_source()})
    DOWNLOADS[module_source] = feed.downloads
    return result


@test("Your tests pass on the correct rates.py")
def _():
    passes_on_correct()


@test("At least three tests use the rates fixture")
def _():
    fixtures, tests = fixture_usage()
    assert "rates" in fixtures, "Keep the fixture called rates"
    users = [name for name, params in tests.items() if "rates" in params]
    assert len(users) >= 3, f"Only {len(users)} test(s) take rates as a parameter; write at least three"


@test("The rates are downloaded once per test run")
def _():
    run(CORRECT)
    downloads = DOWNLOADS[CORRECT]
    assert downloads == 1, (
        f"load_rates() downloaded the rates {downloads} times in one run. "
        "Give the rates fixture a scope that's wider than one test."
    )


@test("Catches rounding down instead of half-up")
def _():
    assert catches(ROUNDS_DOWN), (
        "A bug slipped through: convert rounded down (127.647 became 127.64), and all your tests "
        "still passed. Test a conversion whose exact result ends in half a cent or more."
    )


@hidden("Catches a conversion done the wrong way round")
def _():
    assert catches(WRONG_WAY_ROUND), (
        "A bug slipped through: convert multiplied by the source rate and divided by the target "
        "rate, and all your tests still passed. Test a conversion between two currencies that "
        "aren't the euro."
    )


@hidden("Catches rounding to whole units")
def _():
    assert catches(WHOLE_UNITS), (
        "A bug slipped through: convert rounded to whole units instead of cents, and all your "
        "tests still passed."
    )
