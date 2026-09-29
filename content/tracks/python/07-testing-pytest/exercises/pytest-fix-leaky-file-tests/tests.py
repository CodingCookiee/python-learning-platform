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

MODULE, TEST_FILE = "report.py", "test_report.py"

# Runs the tests in reverse order, and fails any test that leaves a file in the project folder
SUPPORT["conftest.py"] = STAY_IN_TMP + '''

def pytest_collection_modifyitems(items):
    items.reverse()
'''

CORRECT = '''
import csv
from decimal import Decimal


def write_daily_report(sales, path):
    """Write (item, quantity, unit_price) sales to a CSV report with a line total per row."""
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["item", "quantity", "unit_price", "line_total"])
        for item, quantity, unit_price in sales:
            writer.writerow([item, quantity, unit_price, f"{quantity * Decimal(unit_price):.2f}"])


def read_report_total(path):
    """The sum of the line_total column of a report written by write_daily_report."""
    with open(path, newline="", encoding="utf-8") as file:
        return sum((Decimal(row["line_total"]) for row in csv.DictReader(file)), Decimal("0"))
'''

NO_HEADER = planted('        writer.writerow(["item", "quantity", "unit_price", "line_total"])\n', "")
LINE_TOTAL_IS_UNIT_PRICE = planted('f"{quantity * Decimal(unit_price):.2f}"', 'f"{Decimal(unit_price):.2f}"')
READER_SKIPS_LAST_ROW = planted("for row in csv.DictReader(file))", "for row in list(csv.DictReader(file))[:-1])")


@test("Each test passes on its own, in any order")
def _():
    result = run(CORRECT)
    assert len(result.passed + result.failed) >= 3, "Keep all three tests"
    assert result.failed == [], (
        "We ran your tests in reverse order, and these failed on the correct code. A test "
        "mustn't depend on a file another test wrote:\n" + report(result)
    )


@test("No test leaves a file in the project folder")
def _():
    result = run(CORRECT)
    broken = [name for name in result.errors if name.startswith("collecting")]
    assert broken == [], "pytest couldn't load your test file:\n" + report(result)
    leaky = writes_to_project_folder(result)
    assert leaky == [], (
        "These tests left daily_report.csv in the project folder: " + ", ".join(leaky)
        + ". Write it inside tmp_path instead."
    )


@test("Catches a report without a header")
def _():
    assert catches(NO_HEADER), (
        "A bug slipped through: the report had no header row, and all your tests still passed."
    )


@hidden("Catches line totals that ignore the quantity")
def _():
    assert catches(LINE_TOTAL_IS_UNIT_PRICE), (
        "A bug slipped through: each line total was just the unit price, and all your tests still passed."
    )


@hidden("Catches the reader leaving out the last row")
def _():
    assert catches(READER_SKIPS_LAST_ROW), (
        "A bug slipped through: read_report_total left out the last row, and all your tests still passed."
    )
