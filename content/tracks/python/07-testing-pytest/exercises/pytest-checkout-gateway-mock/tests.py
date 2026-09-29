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

MODULE, TEST_FILE = "checkout.py", "test_checkout.py"

CORRECT = '''
class PaymentDeclined(Exception):
    """Raised by the gateway when the card is declined."""


def checkout(order, gateway):
    """Charge an order through the payment gateway (see the prompt)."""
    if order["total"] == 0:
        return {"status": "paid", "charge_id": None}
    pence = int(order["total"] * 100)
    try:
        charge = gateway.charge(pence, order["currency"], idempotency_key=order["id"])
    except PaymentDeclined as error:
        return {"status": "declined", "reason": str(error)}
    return {"status": "paid", "charge_id": charge["id"]}
'''

CHARGES_POUNDS = planted('pence = int(order["total"] * 100)', 'pence = int(order["total"])')
NO_IDEMPOTENCY_KEY = planted(
    'gateway.charge(pence, order["currency"], idempotency_key=order["id"])',
    'gateway.charge(pence, order["currency"])',
)
RETRIES_DECLINE = planted(
    """    except PaymentDeclined as error:
        return {"status": "declined", "reason": str(error)}
""",
    """    except PaymentDeclined:
        try:
            charge = gateway.charge(pence, order["currency"], idempotency_key=order["id"])
        except PaymentDeclined as error:
            return {"status": "declined", "reason": str(error)}
""",
)
CHARGES_FREE_ORDERS = planted(
    """    if order["total"] == 0:
        return {"status": "paid", "charge_id": None}
""",
    "",
)


@test("Your tests pass on the correct checkout.py")
def _():
    passes_on_correct()


@test("Uses a Mock for the gateway")
def _():
    assert source_uses(name="Mock") or source_uses(name="MagicMock") or source_uses(name="create_autospec"), (
        "Stand in for the gateway with unittest.mock.Mock"
    )


@test("Catches the gateway being charged in pounds")
def _():
    assert catches(CHARGES_POUNDS), (
        "A bug slipped through: an order of 19.99 was charged as 19 (pounds, not pence), and all "
        "your tests still passed. Check the arguments charge was called with."
    )


@hidden("Catches a missing idempotency key")
def _():
    assert catches(NO_IDEMPOTENCY_KEY), (
        "A bug slipped through: the gateway was charged without the idempotency key, and all your "
        "tests still passed. assert_called_once_with checks keyword arguments too."
    )


@hidden("Catches a declined card being charged a second time")
def _():
    assert catches(RETRIES_DECLINE), (
        "A bug slipped through: after a decline, checkout tried the card again, and all your tests "
        "still passed. Check how many times charge was called."
    )


@hidden("Catches a free order being sent to the gateway")
def _():
    assert catches(CHARGES_FREE_ORDERS), (
        "A bug slipped through: an order with a total of 0 was sent to the gateway, and all your "
        "tests still passed."
    )
