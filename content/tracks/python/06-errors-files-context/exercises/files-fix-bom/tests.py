import tempfile
from pathlib import Path

from plp import test, hidden
from solution import statement_columns

BOM = b"\xef\xbb\xbf"


def export(text, *, bom=True):
    """A statement export holding text, with Windows line endings and (like Excel) a BOM."""
    path = Path(tempfile.mkdtemp()) / "statement.csv"
    data = text.replace("\n", "\r\n").encode("utf-8")
    path.write_bytes(BOM + data if bom else data)
    return path


@test("Reads the column names from an Excel export")
def _():
    path = export("Date,Description,Amount\n2026-09-02,Card payment,-45.60\n")
    assert statement_columns(path) == ["Date", "Description", "Amount"]


@test("Reads an export without a byte order mark too")
def _():
    path = export("Date,Description,Amount\n2026-09-02,Card payment,-45.60\n", bom=False)
    assert statement_columns(path) == ["Date", "Description", "Amount"]


@test("Keeps accented column names intact")
def _():
    path = export("Date,Référence,Montant\n2026-09-02,Café Lumière,-12.40\n")
    assert statement_columns(path) == ["Date", "Référence", "Montant"]


@hidden("Strips spaces around the names")
def _():
    path = export("Date , Description,  Amount \n")
    assert statement_columns(path) == ["Date", "Description", "Amount"]


@hidden("Works for a file with only a header and no newline")
def _():
    path = export("Booking date,Value date,Amount")
    assert statement_columns(str(path)) == ["Booking date", "Value date", "Amount"]
