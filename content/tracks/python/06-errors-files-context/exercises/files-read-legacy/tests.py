import tempfile
from pathlib import Path

from plp import test, hidden, raises
from solution import read_export


def export(text, encoding):
    path = Path(tempfile.mkdtemp()) / "sales.csv"
    path.write_bytes(text.encode(encoding))
    return path


@test("Reads a file the old package wrote in cp1252")
def _():
    assert read_export(export("Café Lumière,€4.50\n", "cp1252")) == "Café Lumière,€4.50\n"


@test("Reads a UTF-8 file from the new tills")
def _():
    assert read_export(export("Crème brûlée,€5.20\n", "utf-8")) == "Crème brûlée,€5.20\n"


@test("Plain ASCII reads the same either way")
def _():
    assert read_export(export("Espresso,2.10\nLatte,3.40\n", "utf-8")) == "Espresso,2.10\nLatte,3.40\n"


@hidden("Doesn't replace characters it can't decode")
def _():
    text = read_export(export("Señor Café, 3×€1.80\n", "cp1252"))
    assert "�" not in text, "Found a replacement character: decode as cp1252 instead of using errors='replace'"
    assert text == "Señor Café, 3×€1.80\n"


@hidden("Accepts the path as a string")
def _():
    assert read_export(str(export("Thé vert,2.80\n", "cp1252"))) == "Thé vert,2.80\n"


@hidden("A missing file still raises FileNotFoundError")
def _():
    raises(FileNotFoundError, read_export, Path(tempfile.mkdtemp()) / "missing.csv")
