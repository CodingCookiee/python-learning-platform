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


def fixtures_in(source):
    """The names of the fixtures a file defines."""
    names = []
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if any("fixture" in ast.unparse(d) for d in node.decorator_list):
                names.append(node.name)
    return names


def test_params(source):
    """Each test function's parameters: {"test_x": ["cart", ...]}."""
    return {
        node.name: [a.arg for a in node.args.args]
        for node in ast.walk(ast.parse(source))
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith("test")
    }


MODULE, TEST_FILE = "cart.py", "test_cart.py"

CONFTEST = plp.learner_files().get("conftest.py", "")

# The teammate's file, as in the read-only tab
DISCOUNT_TESTS = '''
from cart import Cart, Customer


def test_members_get_ten_percent_off(cart, member):
    assert cart.total_for(member) == 1755


def test_guests_pay_full_price(cart):
    assert cart.total_for(Customer("Sam")) == 1950


def test_small_orders_get_no_discount(member):
    small = Cart()
    small.add("TEA", 2, 350)
    assert small.total_for(member) == 700
'''

SUPPORT.update({"conftest.py": CONFTEST, "test_discounts.py": DISCOUNT_TESTS})

CORRECT = '''
from dataclasses import dataclass


@dataclass
class Customer:
    name: str
    member: bool = False


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

    @property
    def item_count(self):
        """How many units are in the cart."""
        return sum(quantity for quantity, _ in self._lines.values())

    @property
    def total_pence(self):
        return sum(quantity * price for quantity, price in self._lines.values())

    def total_for(self, customer):
        """What the customer pays: members get 10% off orders of 1000p or more."""
        total = self.total_pence
        if customer.member and total >= 1000:
            total -= total // 10
        return total
'''

DISCOUNT_ABOVE_1000 = planted("total >= 1000", "total > 1000")
COUNTS_LINES = planted(
    "return sum(quantity for quantity, _ in self._lines.values())", "return len(self._lines)"
)


@test("Every test passes on the correct cart.py, in both files")
def _():
    passes_on_correct()


@test("conftest.py defines the cart and member fixtures")
def _():
    found = fixtures_in(CONFTEST)
    missing = [name for name in ("cart", "member") if name not in found]
    assert not missing, (
        f"conftest.py has no {' or '.join(missing)} fixture yet. Define each one with @pytest.fixture "
        "in conftest.py, so every test file can ask for it."
    )


@test("test_cart.py uses the shared cart instead of its own copy")
def _():
    own = fixtures_in(solution_source())
    assert "cart" not in own, (
        "test_cart.py still defines its own cart fixture, which hides the one in conftest.py for "
        "its tests. Delete it: two copies drift apart the first time someone edits one."
    )


@test("Your new test asks for the member fixture")
def _():
    users = [name for name, params in test_params(solution_source()).items() if "member" in params]
    assert users, "Add a test to test_cart.py that takes member as a parameter"


@test("Catches the discount starting above 1000p instead of at 1000p")
def _():
    assert catches(DISCOUNT_ABOVE_1000), (
        "A bug slipped through: members got no discount on an order of exactly 1000p, and all the "
        "tests still passed. Test a member's order of exactly 1000p: they should pay 900."
    )


@hidden("Catches item_count counting lines instead of units")
def _():
    assert catches(COUNTS_LINES), (
        "A bug slipped through: item_count counted lines instead of units. Keep the item_count test."
    )


@hidden("test_cart.py doesn't import from conftest.py")
def _():
    imports = [
        node for node in ast.walk(ast.parse(solution_source()))
        if (isinstance(node, ast.ImportFrom) and node.module == "conftest")
        or (isinstance(node, ast.Import) and any(a.name == "conftest" for a in node.names))
    ]
    assert not imports, (
        "Don't import conftest: pytest hands fixtures to tests by parameter name. Importing them "
        "can run them as plain functions and confuses pytest's own loading of conftest.py."
    )
