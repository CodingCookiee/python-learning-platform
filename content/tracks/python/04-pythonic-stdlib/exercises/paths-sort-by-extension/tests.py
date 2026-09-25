import tempfile
from pathlib import Path

from plp import test, hidden
from solution import sort_by_extension

FILES = ["invoice-1042.PDF", "report.csv", "data.CSV", "photo.jpg", "README"]


def make_folder(*names):
    root = Path(tempfile.mkdtemp())
    for name in names:
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"contents of {path.name}", encoding="utf-8")
    return root


@test("Counts the files moved into each subfolder")
def _():
    root = make_folder(*FILES)
    assert sort_by_extension(root) == {"pdf": 1, "csv": 2, "jpg": 1, "other": 1}


@test("Moves the files and keeps their names and contents")
def _():
    root = make_folder(*FILES)
    sort_by_extension(root)
    assert not (root / "report.csv").exists(), "report.csv should have moved out of the top folder"
    assert (root / "csv" / "data.CSV").read_text(encoding="utf-8") == "contents of data.CSV"
    assert (root / "other" / "README").exists()


@test("Leaves existing folders and their contents alone")
def _():
    root = make_folder("old/notes.txt", "photo.png")
    assert sort_by_extension(str(root)) == {"png": 1}
    assert (root / "old" / "notes.txt").exists()


@hidden("Running it again moves nothing")
def _():
    root = make_folder(*FILES)
    sort_by_extension(root)
    assert sort_by_extension(root) == {}


@hidden("Uses only the last extension, and treats dotfiles as having none")
def _():
    root = make_folder("backup.tar.gz", ".env")
    assert sort_by_extension(root) == {"gz": 1, "other": 1}
    assert (root / "gz" / "backup.tar.gz").exists()
    assert (root / "other" / ".env").exists()
