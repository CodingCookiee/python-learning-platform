import ast
import re
from functools import cache

from plp import defined_names, hidden, pytest_run, solution_source, source_uses, test

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

MODULE, TEST_FILE = "payroll.py", "test_payroll.py"

CORRECT = '''
from decimal import ROUND_HALF_UP, Decimal

BANDS = [  # (top of the band, rate)
    (Decimal("12570"), Decimal("0.00")),
    (Decimal("50270"), Decimal("0.20")),
    (Decimal("125140"), Decimal("0.40")),
    (Decimal("Infinity"), Decimal("0.45")),
]


def income_tax(income):
    """Tax on a yearly income (a Decimal), rounded half-up to the penny."""
    tax = Decimal("0")
    lower = Decimal("0")
    for upper, rate in BANDS:
        if income > lower:
            tax += (min(income, upper) - lower) * rate
        lower = upper
    return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
'''

FLAT_RATE = planted(
    """    for upper, rate in BANDS:
        if income > lower:
            tax += (min(income, upper) - lower) * rate
        lower = upper
""",
    """    for upper, rate in BANDS:
        if income <= upper:
            tax = income * rate
            break
""",
)
BANKERS_ROUNDING = planted("rounding=ROUND_HALF_UP)", "rounding=ROUND_HALF_EVEN)").replace(
    "import ROUND_HALF_UP,", "import ROUND_HALF_EVEN, ROUND_HALF_UP,"
)
BAND_TYPO = planted('(Decimal("50270"), Decimal("0.20"))', '(Decimal("50000"), Decimal("0.20"))')


@test("Your test passes on the correct payroll.py")
def _():
    passes_on_correct()


@test("A parametrized test with at least six named cases")
def _():
    assert source_uses(name="parametrize"), "Use @pytest.mark.parametrize"
    found = cases(run(CORRECT))
    assert len(found) >= 6, f"pytest found {len(found)} parametrized case(s); write at least six"
    assert parametrize_ids_given(), 'Name each case with ids=[...] or pytest.param(..., id="...")'


@test("Catches the whole income being taxed at one rate")
def _():
    assert catches(FLAT_RATE), (
        "A bug slipped through: the whole income was taxed at the rate of the band it reached "
        "(20,000 paid 4,000.00 instead of 1,486.00), and every case still passed."
    )


@hidden("Catches the basic band ending at 50,000")
def _():
    assert catches(BAND_TYPO), (
        "A bug slipped through: the basic band ended at 50,000 instead of 50,270, and every case "
        "still passed. Test an income above 50,000 with an exact expected value."
    )


@hidden("Catches banker's rounding of half a penny")
def _():
    assert catches(BANKERS_ROUNDING), (
        "A bug slipped through: the tax was rounded half-to-even (banker's rounding) instead of "
        "half-up, and every case still passed. Add an income whose tax is exactly half a penny, "
        "such as 125140.10 (10p at 45% is 4.5p)."
    )
