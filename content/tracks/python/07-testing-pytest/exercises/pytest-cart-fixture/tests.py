import ast
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

MODULE, TEST_FILE = "cart.py", "test_cart.py"

CORRECT = '''
class Cart:
    """A shopping cart. Prices are in pence."""

    def __init__(self):
        self._lines = {}  # sku -> [quantity, unit_price]

    def add(self, sku, quantity, unit_price):
        """Add units of a product. Adding a SKU that's already there adds to its quantity."""
        if sku in self._lines:
            self._lines[sku][0] += quantity
        else:
            self._lines[sku] = [quantity, unit_price]

    def remove(self, sku):
        """Take a product out of the cart entirely."""
        del self._lines[sku]

    @property
    def item_count(self):
        """How many units are in the cart."""
        return sum(quantity for quantity, _ in self._lines.values())

    @property
    def total_pence(self):
        return sum(quantity * price for quantity, price in self._lines.values())
'''

COUNTS_LINES = planted(
    "return sum(quantity for quantity, _ in self._lines.values())", "return len(self._lines)"
)
ADD_REPLACES = planted("if sku in self._lines:", "if False:")
REMOVE_CLEARS = planted("del self._lines[sku]", "self._lines.clear()")


@test("Your tests pass on the correct cart.py")
def _():
    passes_on_correct()


@test("Defines a cart fixture and uses it in at least two tests")
def _():
    fixtures, tests = fixture_usage()
    assert "cart" in fixtures, "Write a function called cart decorated with @pytest.fixture"
    users = [name for name, params in tests.items() if "cart" in params]
    assert len(users) >= 2, f"Only {len(users)} test(s) take cart as a parameter; use the fixture in at least two"


@test("Catches item_count counting lines instead of units")
def _():
    assert catches(COUNTS_LINES), (
        "A bug slipped through: item_count returned the number of lines (2) instead of units (3), "
        "and all your tests still passed."
    )


@hidden("Catches add replacing the quantity")
def _():
    assert catches(ADD_REPLACES), (
        "A bug slipped through: adding a product that's already in the cart replaced its "
        "quantity instead of adding to it, and all your tests still passed."
    )


@hidden("Catches remove emptying the whole cart")
def _():
    assert catches(REMOVE_CLEARS), (
        "A bug slipped through: remove(\"MUG\") emptied the whole cart, and all your tests still "
        "passed. Check what's left after removing one product."
    )
