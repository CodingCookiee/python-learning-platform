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

# Fails any test that leaves a file in the folder pytest runs in (the "project folder")
STAY_IN_TMP = '''
import os

import pytest


@pytest.fixture(autouse=True)
def _stays_out_of_the_project_folder():
    before = set(os.listdir())
    yield
    added = sorted(set(os.listdir()) - before - {"__pycache__"})
    if added:
        pytest.fail("wrote into the project folder: " + ", ".join(added), pytrace=False)
'''


def writes_to_project_folder(result):
    """Tests whose teardown found new files in the project folder."""
    return [name for name in result.errors if not name.startswith("collecting")]

MODULE, TEST_FILE = "sales_cli.py", "test_sales_cli.py"
SUPPORT["conftest.py"] = STAY_IN_TMP

CORRECT = '''
import csv
import sys
from decimal import Decimal
from pathlib import Path


def main(argv):
    """Summarise a sales CSV (see the prompt)."""
    if len(argv) != 1:
        print("usage: sales_cli.py SALES_CSV", file=sys.stderr)
        return 2
    path = Path(argv[0])
    if not path.exists():
        print(f"error: no such file: {path.name}", file=sys.stderr)
        return 1
    with path.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    items = sum(int(row["quantity"]) for row in rows)
    total = sum((int(row["quantity"]) * Decimal(row["unit_price"]) for row in rows), Decimal("0"))
    print(f"{len(rows)} sales, {items} items, total {total:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
'''

ERROR_ON_STDOUT = planted(
    'print(f"error: no such file: {path.name}", file=sys.stderr)', 'print(f"error: no such file: {path.name}")'
)
MISSING_FILE_SUCCEEDS = planted(
    """        print(f"error: no such file: {path.name}", file=sys.stderr)
        return 1""",
    """        print(f"error: no such file: {path.name}", file=sys.stderr)
        return 0""",
)
SKIPS_FIRST_SALE = planted("rows = list(csv.DictReader(file))", "rows = list(csv.DictReader(file))[1:]")
NO_ARGUMENT_CHECK = planted(
    """    if len(argv) != 1:
        print("usage: sales_cli.py SALES_CSV", file=sys.stderr)
        return 2
""",
    "",
)


@test("Your tests pass on the correct sales_cli.py")
def _():
    result = run(CORRECT)
    assert result.total > 0, "pytest didn't collect any tests. Name each test function test_something."
    assert result.failed == [], (
        "These fail on the correct code, so they expect the wrong thing:\n" + report(result)
    )


@test("Uses tmp_path and capsys, and leaves the project folder alone")
def _():
    assert source_uses(name="tmp_path"), "Write the sales files into tmp_path"
    assert source_uses(name="capsys"), "Check the output with capsys"
    result = run(CORRECT)
    broken = [name for name in result.errors if name.startswith("collecting")]
    assert broken == [], "pytest couldn't load your test file:\n" + report(result)
    leaky = writes_to_project_folder(result)
    assert leaky == [], "These tests left files in the project folder: " + ", ".join(leaky)


@test("Catches the first sale being left out")
def _():
    assert catches(SKIPS_FIRST_SALE), (
        "A bug slipped through: the first sale in the file was left out of the summary, and all "
        "your tests still passed. Check the whole summary line."
    )


@hidden("Catches the error message going to stdout")
def _():
    assert catches(ERROR_ON_STDOUT), (
        "A bug slipped through: the missing-file error was printed to standard output instead of "
        "standard error, and all your tests still passed. Check captured.out and captured.err."
    )


@hidden("Catches a missing file returning exit code 0")
def _():
    assert catches(MISSING_FILE_SUCCEEDS), (
        "A bug slipped through: a missing file returned exit code 0, so a script calling the tool "
        "would think it worked, and all your tests still passed."
    )


@hidden("Catches running with no arguments crashing")
def _():
    assert catches(NO_ARGUMENT_CHECK), (
        "A bug slipped through: running the tool with no arguments crashed with IndexError instead "
        "of printing usage and returning 2, and all your tests still passed."
    )
