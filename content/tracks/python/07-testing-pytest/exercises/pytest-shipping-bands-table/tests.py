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


def parametrize_ids_given():
    """True if the learner named their cases, with ids= or pytest.param(..., id=...)."""
    for node in ast.walk(ast.parse(solution_source())):
        if isinstance(node, ast.Call):
            for keyword in node.keywords:
                if keyword.arg == "ids" or (keyword.arg == "id" and "param" in ast.unparse(node.func)):
                    return True
    return False


def cases(result):
    """The parametrized test items in a run, such as test_band[exactly-2kg]."""
    return [name for name in result.passed + result.failed if "[" in name]

MODULE, TEST_FILE = "shipping.py", "test_shipping.py"

CORRECT = '''
def shipping_band(weight_kg):
    """The shipping band for a parcel: "small" up to and including 2 kg,
    "medium" up to and including 10 kg, and "large" above that."""
    if weight_kg <= 2:
        return "small"
    if weight_kg <= 10:
        return "medium"
    return "large"
'''

SMALL_BELOW_2 = planted("weight_kg <= 2:", "weight_kg < 2:")
MEDIUM_BELOW_10 = planted("weight_kg <= 10:", "weight_kg < 10:")
MEDIUM_TO_20 = planted("weight_kg <= 10:", "weight_kg <= 20:")


@test("Your test passes on the correct shipping.py")
def _():
    passes_on_correct()


@test("Uses parametrize with at least five cases")
def _():
    assert source_uses(name="parametrize"), "Keep the @pytest.mark.parametrize table"
    found = cases(run(CORRECT))
    assert len(found) >= 5, f"pytest found {len(found)} parametrized case(s); add at least five"


@test("Catches exactly 2 kg counting as medium")
def _():
    assert catches(SMALL_BELOW_2), (
        "A bug slipped through: a parcel of exactly 2 kg was put in the medium band, and every "
        "case still passed. Add a case at exactly 2 kg."
    )


@hidden("Catches exactly 10 kg counting as large")
def _():
    assert catches(MEDIUM_BELOW_10), (
        "A bug slipped through: a parcel of exactly 10 kg was put in the large band, and every "
        "case still passed. Add a case at exactly 10 kg."
    )


@hidden("Catches the medium band running on to 20 kg")
def _():
    assert catches(MEDIUM_TO_20), (
        "A bug slipped through: parcels up to 20 kg were medium, and every case still passed. "
        "Add a case just over 10 kg."
    )
