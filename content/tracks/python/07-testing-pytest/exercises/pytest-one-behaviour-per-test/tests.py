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

MODULE, TEST_FILE = "subscriptions.py", "test_subscription.py"

CORRECT = '''
PLANS = {"basic": 900, "pro": 2900, "team": 7900}  # pence a month


class Subscription:
    def __init__(self, plan):
        if plan not in PLANS:
            raise ValueError(f"unknown plan: {plan}")
        self.plan = plan
        self.active = True
        self.invoices = []

    def monthly_price(self):
        return PLANS[self.plan]

    def change_plan(self, plan):
        if not self.active:
            raise ValueError("can't change the plan of a cancelled subscription")
        if plan not in PLANS:
            raise ValueError(f"unknown plan: {plan}")
        self.plan = plan

    def cancel(self):
        self.active = False

    def bill(self):
        """Record this month's invoice and return its amount, or None once cancelled."""
        if not self.active:
            return None
        amount = self.monthly_price()
        self.invoices.append(amount)
        return amount
'''

BILLS_CANCELLED = planted(
    """        if not self.active:
            return None
""",
    "",
)
CHANGES_AFTER_CANCEL = planted(
    """        if not self.active:
            raise ValueError("can't change the plan of a cancelled subscription")
""",
    "",
)
ACCEPTS_UNKNOWN_PLAN = planted(
    """        if plan not in PLANS:
            raise ValueError(f"unknown plan: {plan}")
        self.plan = plan""",
    """        self.plan = plan""",
)
BILL_NOT_RECORDED = planted("        self.invoices.append(amount)\n", "")


def checks_per_test():
    """How many asserts and pytest.raises blocks each test function makes."""
    counts = {}
    for node in ast.walk(ast.parse(solution_source())):
        if isinstance(node, ast.FunctionDef) and node.name.startswith("test"):
            asserts = sum(isinstance(inner, ast.Assert) for inner in ast.walk(node))
            raises = sum(
                isinstance(inner, ast.withitem) and "raises" in ast.unparse(inner.context_expr)
                for inner in ast.walk(node)
            )
            counts[node.name] = asserts + raises
    return counts


@test("Your tests pass on the correct subscriptions.py")
def _():
    passes_on_correct()


@test("At least five tests, each named after its behaviour")
def _():
    names = list(checks_per_test())
    assert len(names) >= 5, f"Found {len(names)} test function(s); split the behaviours into at least five"
    vague = [name for name in names if name in ("test_subscription", "test_subscriptions") or name[5:].isdigit()]
    assert vague == [], f"Give these tests names that say what they check: {', '.join(vague)}"


@test("No test makes more than three checks")
def _():
    crowded = {name: count for name, count in checks_per_test().items() if count > 3}
    assert crowded == {}, (
        "These tests still check too much: "
        + ", ".join(f"{name} ({count} checks)" for name, count in crowded.items())
    )


@test("Still catches a cancelled subscription being billed")
def _():
    assert catches(BILLS_CANCELLED), (
        "A bug slipped through: a cancelled subscription was still billed, and all your tests still passed."
    )


@hidden("Still catches a plan change after cancelling")
def _():
    assert catches(CHANGES_AFTER_CANCEL), (
        "A bug slipped through: a cancelled subscription could change plan, and all your tests still passed."
    )


@hidden("Still catches an unknown plan being accepted")
def _():
    assert catches(ACCEPTS_UNKNOWN_PLAN), (
        "A bug slipped through: change_plan(\"enterprise\") was accepted, and all your tests still passed."
    )


@hidden("Still catches a bill that isn't recorded")
def _():
    assert catches(BILL_NOT_RECORDED), (
        "A bug slipped through: bill() returned the amount but didn't record the invoice, and all "
        "your tests still passed."
    )
