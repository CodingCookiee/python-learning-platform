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

MODULE, TEST_FILE = "export.py", "test_export.py"
SUPPORT["conftest.py"] = STAY_IN_TMP

CORRECT = '''
import csv
from pathlib import Path


def export_invoices(invoices, path, overwrite=False):
    """Write invoices to a CSV file and return how many were written (see the prompt)."""
    path = Path(path)
    if path.exists() and not overwrite:
        raise FileExistsError(f"{path} already exists")
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["number", "customer", "total"])
        for invoice in invoices:
            writer.writerow([invoice["number"], invoice["customer"], f"{invoice['total']:.2f}"])
    return len(invoices)
'''

NO_HEADER = planted('        writer.writerow(["number", "customer", "total"])\n', "")
REPLACES_EXISTING = planted("if path.exists() and not overwrite:", "if False:")
TOTAL_AS_IS = planted("f\"{invoice['total']:.2f}\"", "str(invoice['total'])")


@test("Your tests pass on the correct export.py")
def _():
    result = run(CORRECT)
    assert result.total > 0, "pytest didn't collect any tests. Name each test function test_something."
    assert result.failed == [], (
        "These fail on the correct code, so they expect the wrong thing:\n" + report(result)
    )


@test("Every file goes in tmp_path")
def _():
    assert source_uses(name="tmp_path"), "Write the files inside the tmp_path fixture's folder"
    result = run(CORRECT)
    broken = [name for name in result.errors if name.startswith("collecting")]
    assert broken == [], "pytest couldn't load your test file:\n" + report(result)
    leaky = writes_to_project_folder(result)
    assert leaky == [], "These tests left files in the project folder: " + ", ".join(leaky)


@test("Catches a missing header row")
def _():
    assert catches(NO_HEADER), (
        "A bug slipped through: the file had no header row, and all your tests still passed. "
        "Check the first line of the file."
    )


@hidden("Catches an existing file being replaced")
def _():
    assert catches(REPLACES_EXISTING), (
        "A bug slipped through: export_invoices replaced an existing file without overwrite=True, "
        "and all your tests still passed."
    )


@hidden("Catches totals written without two decimal places")
def _():
    assert catches(TOTAL_AS_IS), (
        "A bug slipped through: a total of Decimal(\"12.5\") was written as 12.5 instead of 12.50, "
        "and all your tests still passed."
    )
