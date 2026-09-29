import tempfile
from pathlib import Path

from plp import test, hidden, raises
from solution import count_entries


def statement(text):
    """A fresh UTF-8 file holding text, in its own temporary folder."""
    path = Path(tempfile.mkdtemp()) / "statement.txt"
    path.write_text(text, encoding="utf-8")
    return path


@test("Counts the lines that have something on them")
def _():
    path = statement(
        "2026-09-01 Opening balance 1200.00\n"
        "\n"
        "2026-09-02 Card payment, Café Lumière -12.40\n"
        "\n"
        "2026-09-03 Salary 2450.00\n"
    )
    assert count_entries(path) == 3


@test("A line of only spaces is blank")
def _():
    path = statement("2026-09-01 Opening balance 1200.00\n   \n\t\n2026-09-02 Refund 5.00\n")
    assert count_entries(path) == 2


@test("Accepts the path as a string")
def _():
    path = statement("2026-09-01 Opening balance 1200.00\n")
    assert count_entries(str(path)) == 1


@hidden("Counts a last line that has no newline")
def _():
    path = statement("2026-09-01 Salary 2450.00\n2026-09-02 Rent -950.00")
    assert count_entries(path) == 2


@hidden("An empty file has no entries")
def _():
    assert count_entries(statement("")) == 0


@hidden("A missing file raises FileNotFoundError")
def _():
    missing = Path(tempfile.mkdtemp()) / "no-such-statement.txt"
    raises(FileNotFoundError, count_entries, missing)
