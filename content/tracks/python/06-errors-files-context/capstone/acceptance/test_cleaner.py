"""Acceptance tests for the CSV cleaner, run by GitHub Actions in your repository.

They run `python cleaner.py <file>` on the sample export and on messier ones in a temporary
folder, and import clean_row, clean_file and the exception classes from cleaner.py.
"""

import csv
import importlib
import io
import logging
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

PROGRAM = Path("cleaner.py")

SAMPLE_LINES = [
    "Order ID,Date,Email,SKU,Qty,Unit Price,Status",
    "HB-10231,2026-09-21,ada@example.com,MUG-STN,2,12.50,paid",
    "HB-10232,21/09/2026, Grace.Hopper@Example.com ,lamp-02,1,£49.00,Paid",
    "HB-10233,2026-09-22,linus@example.org,TEA-12,three,4.25,paid",
    "HB-10234,2026-09-31,margaret@example.com,MUG-STN,1,12.50,paid",
    "",
    "HB-10235,2026-09-22,not-an-email,PEN-05,4,1.20,shipped",
    'HB-10236,2026-09-23,chloe@example.fr,GRINDER-PRO,1,"£1,249.00",paid',
    "HB-10231,2026-09-21,ada@example.com,MUG-STN,2,12.50,paid",
    "HB-10237,2026-09-23,yusuf@example.com,TEA-12,2,4.255,pending",
    "HB-10238,2026-09-24,zoe@example.com,,1,8.00,paid",
    "HB-10239,2026-09-24,sam@example.com,MUG-STN,1,12.50,refunded,gift wrap",
    "HB-10240,2026-09-24,priya@example.com,LAMP-02,0,49.00,paid",
    ",,,,,,",
    "HB-10241,24/09/2026,omar@example.com,TEA-12,6,4.25,PENDING",
]

CLEAN_CSV = """\
order_id,order_date,email,sku,quantity,unit_price,total,status
HB-10231,2026-09-21,ada@example.com,MUG-STN,2,12.50,25.00,paid
HB-10232,2026-09-21,grace.hopper@example.com,LAMP-02,1,49.00,49.00,paid
HB-10236,2026-09-23,chloe@example.fr,GRINDER-PRO,1,1249.00,1249.00,paid
HB-10241,2026-09-24,omar@example.com,TEA-12,6,4.25,25.50,pending
"""

ERRORS_CSV = """\
line,order_id,field,value,problem
4,HB-10233,qty,three,must be a whole number
5,HB-10234,date,2026-09-31,must be a real date like 2026-09-21 or 21/09/2026
7,HB-10235,email,not-an-email,must be an email address
7,HB-10235,status,shipped,"must be one of paid, pending, refunded"
9,HB-10231,order_id,HB-10231,duplicate of line 2
10,HB-10237,unit_price,4.255,must have at most 2 decimal places
11,HB-10238,sku,,is required
12,HB-10239,row,,"has 8 fields, expected 7"
13,HB-10240,qty,0,must be at least 1
"""

SAMPLE_SUMMARY = """\
Cleaned orders-raw.csv: 12 rows read
  4 clean rows written to orders-raw-clean.csv
  8 rejected rows, 9 problems written to orders-raw-errors.csv"""

GOOD_ROW = {
    "order_id": "HB-10232", "date": "21/09/2026", "email": " Grace.Hopper@Example.com ", "sku": "lamp-02",
    "qty": "1", "unit_price": "£49.00", "status": "Paid",
}


def cleaner():
    """The learner's cleaner module."""
    assert PROGRAM.exists(), "cleaner.py should be at the top of your repository"
    return importlib.import_module("cleaner")


def write_export(path: Path, lines: list[str], encoding: str = "utf-8-sig") -> Path:
    """Write an export the way Excel saves it: a byte order mark and Windows line endings."""
    path.write_bytes(("\r\n".join(lines) + "\r\n").encode(encoding))
    return path


def run(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    """Run `python cleaner.py ...` in tmp_path."""
    assert PROGRAM.exists(), "cleaner.py should be at the top of your repository"
    return subprocess.run(
        [sys.executable, str(PROGRAM.resolve()), *args],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
    )


def rows(path: Path) -> list[list[str]]:
    """The rows of a CSV file, as lists of strings."""
    assert path.exists(), f"{path.name} wasn't written"
    with open(path, newline="", encoding="utf-8-sig") as file:
        return list(csv.reader(file))


def expected(text: str) -> list[list[str]]:
    return list(csv.reader(text.splitlines()))


def group_errors(row: dict) -> list:
    """The FieldErrors clean_row raises for a row, as (field, value, problem) tuples."""
    with pytest.raises(ExceptionGroup) as caught:
        cleaner().clean_row(row)
        pytest.fail(f"clean_row should raise an ExceptionGroup for {row}")
    return [(e.field, e.value, e.problem) for e in caught.value.exceptions]


def test_sample_export_prints_the_summary_and_exits_with_1(tmp_path):
    write_export(tmp_path / "orders-raw.csv", SAMPLE_LINES)
    result = run(tmp_path, "orders-raw.csv")
    assert "Traceback" not in result.stderr, f"cleaner.py crashed:\n{result.stderr[-1500:]}"
    assert result.stdout.strip().splitlines() == SAMPLE_SUMMARY.splitlines()
    assert result.returncode == 1, f"Some rows were rejected, so the exit code should be 1, not {result.returncode}"


def test_sample_export_writes_the_clean_file(tmp_path):
    write_export(tmp_path / "orders-raw.csv", SAMPLE_LINES)
    run(tmp_path, "orders-raw.csv")
    assert rows(tmp_path / "orders-raw-clean.csv") == expected(CLEAN_CSV)


def test_sample_export_writes_the_error_report(tmp_path):
    write_export(tmp_path / "orders-raw.csv", SAMPLE_LINES)
    run(tmp_path, "orders-raw.csv")
    assert rows(tmp_path / "orders-raw-errors.csv") == expected(ERRORS_CSV)


def test_a_cp1252_export_is_read_after_one_warning(tmp_path):
    write_export(tmp_path / "legacy.csv", SAMPLE_LINES, encoding="cp1252")
    result = run(tmp_path, "legacy.csv")
    assert "Traceback" not in result.stderr, f"cleaner.py crashed:\n{result.stderr[-1500:]}"
    assert "legacy.csv isn't UTF-8; reading it as cp1252" in result.stderr, (
        f"Expected a warning that the file isn't UTF-8 on stderr, got:\n{result.stderr}"
    )
    assert rows(tmp_path / "legacy-clean.csv") == expected(CLEAN_CSV), "The cp1252 copy should clean to the same rows"


def test_column_names_are_matched_whatever_their_case_or_spacing(tmp_path):
    lines = [
        "  ORDER ID ,date, Email,sku,QTY ,Unit  Price,STATUS,Notes",
        "HB-20001,2026-09-25,a@example.com,mug-stn,3,2.50,paid,leave by the door",
    ]
    write_export(tmp_path / "week.csv", lines, encoding="utf-8")
    result = run(tmp_path, "week.csv")
    assert result.returncode == 0, f"Expected exit code 0 for an all-clean file:\n{result.stdout}{result.stderr[-1500:]}"
    assert rows(tmp_path / "week-clean.csv")[1] == ["HB-20001", "2026-09-25", "a@example.com", "MUG-STN", "3", "2.50", "7.50", "paid"]
    assert rows(tmp_path / "week-errors.csv") == [["line", "order_id", "field", "value", "problem"]], (
        "With nothing rejected, the error report should hold just its header row"
    )
    assert "0 rejected rows, 0 problems" in result.stdout


def test_a_missing_column_or_file_exits_with_2_and_writes_nothing(tmp_path):
    # The sample with its Unit Price column (the sixth) deleted
    lines = []
    for fields in csv.reader(SAMPLE_LINES):
        out = io.StringIO()
        csv.writer(out, lineterminator="").writerow(fields[:5] + fields[6:])
        lines.append(out.getvalue())
    write_export(tmp_path / "orders.csv", lines)
    result = run(tmp_path, "orders.csv")
    assert result.returncode == 2, f"A missing column should exit with 2, not {result.returncode}"
    assert "Traceback" not in result.stderr, f"A missing column shouldn't print a traceback:\n{result.stderr}"
    assert "error: orders.csv is missing columns: unit_price" in result.stderr
    assert sorted(p.name for p in tmp_path.iterdir()) == ["orders.csv"], "No output files should be created"

    for args in [("nowhere.csv",), ()]:
        result = run(tmp_path, *args)
        assert result.returncode == 2, f"python cleaner.py {' '.join(args)} should exit with 2, not {result.returncode}"
        assert "Traceback" not in result.stderr, f"python cleaner.py {' '.join(args)} printed a traceback"
    assert "error: nowhere.csv not found" in run(tmp_path, "nowhere.csv").stderr
    assert "usage: python cleaner.py <orders.csv>" in run(tmp_path).stderr


def test_summary_uses_the_singular_for_one(tmp_path):
    write_export(tmp_path / "one.csv", [SAMPLE_LINES[0], "HB-1,2026-09-21,ada@example.com,MUG-STN,2,12.50,paid"])
    result = run(tmp_path, "one.csv")
    assert result.stdout.strip().splitlines() == [
        "Cleaned one.csv: 1 row read",
        "  0 clean rows written to one-clean.csv",
        "  1 rejected row, 1 problem written to one-errors.csv",
    ]
    assert rows(tmp_path / "one-errors.csv")[1] == ["2", "HB-1", "order_id", "HB-1", "must look like HB-10231"]


def test_clean_row_cleans_a_messy_good_row():
    clean = cleaner().clean_row(dict(GOOD_ROW))
    assert set(clean) == {"order_id", "order_date", "email", "sku", "quantity", "unit_price", "total", "status"}
    assert [str(clean[k]) for k in ("order_id", "order_date", "email", "sku", "status")] == [
        "HB-10232", "2026-09-21", "grace.hopper@example.com", "LAMP-02", "paid",
    ]
    assert int(clean["quantity"]) == 1
    assert Decimal(str(clean["unit_price"])) == Decimal("49.00") and Decimal(str(clean["total"])) == Decimal("49.00")
    big = cleaner().clean_row({**GOOD_ROW, "qty": "3", "unit_price": '£1,249.99'})
    assert Decimal(str(big["total"])) == Decimal("3749.97"), "total is quantity times unit price, exact to the penny"


def test_clean_row_reports_every_problem_in_a_row():
    module = cleaner()
    row = {"order_id": "HB-10235", "date": "2026-09-22", "email": "not-an-email", "sku": "PEN-05", "qty": "4",
           "unit_price": "1.20", "status": "shipped"}
    with pytest.raises(ExceptionGroup) as caught:
        module.clean_row(row)
    errors = caught.value.exceptions
    assert all(isinstance(e, module.FieldError) for e in errors), "The group should hold only FieldErrors"
    assert [str(e) for e in errors] == ["email must be an email address", "status must be one of paid, pending, refunded"]
    assert [(e.field, e.value, e.problem) for e in errors] == [
        ("email", "not-an-email", "must be an email address"),
        ("status", "shipped", "must be one of paid, pending, refunded"),
    ]
    blank = group_errors({field: "  " for field in module.REQUIRED})
    assert blank == [(field, "", "is required") for field in ["order_id", "date", "email", "sku", "qty", "unit_price", "status"]], (
        "A row of blank fields should give seven 'is required' FieldErrors, in the order of the table"
    )


FIELD_PROBLEMS = [
    ("order_id", "hb10231", "HB10231", "must look like HB-10231"),
    ("order_id", "HB-123", "HB-123", "must look like HB-10231"),
    ("date", "2026-02-30", "2026-02-30", "must be a real date like 2026-09-21 or 21/09/2026"),
    ("date", "09/21/2026", "09/21/2026", "must be a real date like 2026-09-21 or 21/09/2026"),
    ("date", "20260921", "20260921", "must be a real date like 2026-09-21 or 21/09/2026"),
    ("email", "Ada@Example", "ada@example", "must be an email address"),
    ("email", "ada lovelace@example.com", "ada lovelace@example.com", "must be an email address"),
    ("sku", "mug--stn", "MUG--STN", "must be letters and digits joined by hyphens"),
    ("qty", "1.5", "1.5", "must be a whole number"),
    ("qty", "0", "0", "must be at least 1"),
    ("unit_price", "twelve", "twelve", "must be an amount like 12.50"),
    ("unit_price", "0.00", "0.00", "must be more than zero"),
    ("unit_price", "£4.255", "£4.255", "must have at most 2 decimal places"),
    ("status", "Shipped", "shipped", "must be one of paid, pending, refunded"),
]


def test_each_field_reports_its_problem():
    wrong = []
    for field, value, clean_value, problem in FIELD_PROBLEMS:
        got = group_errors({**GOOD_ROW, field: f" {value} "})
        if got != [(field, clean_value, problem)]:
            wrong.append(f"{field} = {value!r}: expected {[(field, clean_value, problem)]}, got {got}")
    assert not wrong, "clean_row reported the wrong problems:\n" + "\n".join(wrong)


def test_exception_classes_form_a_hierarchy():
    module = cleaner()
    assert issubclass(module.InputFileError, module.CleanerError)
    assert issubclass(module.FieldError, module.CleanerError) and issubclass(module.FieldError, ValueError), (
        "FieldError should be both a CleanerError and a ValueError"
    )
    error = module.FieldError("qty", "three", "must be a whole number")
    assert (error.field, error.value, error.problem, str(error)) == ("qty", "three", "must be a whole number", "qty must be a whole number")


def test_an_unexpected_error_in_one_row_is_logged_and_reported(tmp_path, monkeypatch, caplog):
    module = cleaner()
    real_clean_row = module.clean_row

    def broken_clean_row(row):
        if "LAMP" in str(row.get("sku", "")).upper():
            return 1 / 0
        return real_clean_row(row)

    monkeypatch.setattr(module, "clean_row", broken_clean_row)
    source = write_export(tmp_path / "orders-raw.csv", SAMPLE_LINES)
    with caplog.at_level(logging.ERROR):
        summary = module.clean_file(source, tmp_path / "clean.csv", tmp_path / "errors.csv")
    assert (summary.rows, summary.clean, summary.rejected, summary.problems) == (12, 3, 9, 10), (
        "With HB-10232 failing unexpectedly, 3 rows are clean and 9 rejected with 10 problems"
    )
    assert ["3", "HB-10232", "row", "", "unexpected error: ZeroDivisionError: division by zero"] in rows(tmp_path / "errors.csv")
    logged = [r for r in caplog.records if r.levelno >= logging.ERROR and r.exc_info]
    assert logged and "line 3: unexpected error while cleaning" in logged[0].getMessage(), (
        "The unexpected error should be logged with log.exception, including its traceback"
    )


def test_importing_it_prints_nothing_and_configures_no_logging():
    assert PROGRAM.exists(), "cleaner.py should be at the top of your repository"
    code = "import logging, cleaner; assert not logging.getLogger().handlers, 'logging was configured on import'"
    result = subprocess.run([sys.executable, "-c", code], input="", capture_output=True, text=True, timeout=20)
    assert result.returncode == 0, (
        f"Importing cleaner.py should do nothing until main() runs (call logging.basicConfig only in main):\n{result.stderr[-800:]}"
    )
    assert result.stdout == "", f"Importing cleaner.py printed something: {result.stdout!r}"
