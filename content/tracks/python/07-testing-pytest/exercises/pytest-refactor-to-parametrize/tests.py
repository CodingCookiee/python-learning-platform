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

MODULE, TEST_FILE = "strength.py", "test_strength.py"

CORRECT = '''
def password_strength(password):
    """"weak", "medium" or "strong".

    Under 8 characters is always weak. From 8 characters, a password is strong if it
    has a letter, a digit and a symbol (anything that isn't a letter or digit), medium
    if it has two of those three kinds, and weak with only one.
    """
    if len(password) < 8:
        return "weak"
    kinds = sum([
        any(char.isalpha() for char in password),
        any(char.isdigit() for char in password),
        any(not char.isalnum() for char in password),
    ])
    return {3: "strong", 2: "medium"}.get(kinds, "weak")
'''

SEVEN_IS_ENOUGH = planted("len(password) < 8", "len(password) < 7")
SYMBOLS_IGNORED = planted("any(not char.isalnum() for char in password)", "any(char.isspace() for char in password)")
TWO_KINDS_STRONG = planted('{3: "strong", 2: "medium"}', '{3: "strong", 2: "strong", 1: "medium"}')


def test_functions():
    return [name for name in defined_names("function") if name.startswith("test")]


@test("Your test passes on the correct strength.py")
def _():
    passes_on_correct()


@test("One parametrized test covers all six cases")
def _():
    assert source_uses(name="parametrize"), "Use @pytest.mark.parametrize"
    assert len(test_functions()) == 1, (
        f"Found {len(test_functions())} test functions: {', '.join(test_functions())}. Merge them into one."
    )
    found = cases(run(CORRECT))
    assert len(found) >= 6, f"pytest found {len(found)} case(s); keep all six"


@test("Each case has an id")
def _():
    assert parametrize_ids_given(), 'Name the cases with ids=[...] or pytest.param(..., id="...")'


@hidden("Still catches a 7-character password counting as long enough")
def _():
    assert catches(SEVEN_IS_ENOUGH), (
        "A bug slipped through: 7-character passwords were rated on their characters, and every "
        "case still passed. Keep the seven-character case from the original tests."
    )


@hidden("Still catches symbols not being counted")
def _():
    assert catches(SYMBOLS_IGNORED), (
        "A bug slipped through: symbols weren't counted as a kind of character, and every case "
        "still passed. Keep the cases with symbols from the original tests."
    )


@hidden("Still catches two kinds counting as strong")
def _():
    assert catches(TWO_KINDS_STRONG), (
        "A bug slipped through: a password with two kinds of character was rated strong, and every "
        "case still passed. Keep the medium cases from the original tests."
    )
