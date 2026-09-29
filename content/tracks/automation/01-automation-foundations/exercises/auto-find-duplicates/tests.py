import tempfile
from pathlib import Path

from plp import hidden, test
from solution import find_duplicates


def make_folder(files):
    folder = Path(tempfile.mkdtemp())
    for name, data in files.items():
        path = folder / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return folder


@test("Finds a statement uploaded twice")
def _():
    inbox = make_folder({
        "statement-march.pdf": b"%PDF statement 03",
        "scans/Scan 14.pdf": b"%PDF statement 03",
        "statement-april.pdf": b"%PDF statement 04",
    })
    assert find_duplicates(inbox) == [["scans/Scan 14.pdf", "statement-march.pdf"]]


@test("No duplicates gives an empty list")
def _():
    assert find_duplicates(make_folder({"a.pdf": b"one", "b.pdf": b"two"})) == []


@test("Groups three copies together and keeps separate groups apart")
def _():
    inbox = make_folder({
        "logo.png": b"PNG logo",
        "logo copy.png": b"PNG logo",
        "old/logo.png": b"PNG logo",
        "receipt-1.jpg": b"JPG receipt",
        "receipt-2.jpg": b"JPG receipt",
    })
    assert find_duplicates(inbox) == [
        ["logo copy.png", "logo.png", "old/logo.png"],
        ["receipt-1.jpg", "receipt-2.jpg"],
    ]


@hidden("Same size but different bytes are not duplicates")
def _():
    assert find_duplicates(make_folder({"a.csv": b"1,2,3", "b.csv": b"3,2,1"})) == []


@hidden("Finds duplicates deep in subfolders and ignores the folders themselves")
def _():
    inbox = make_folder({"2026/03/a.txt": b"same", "2025/12/b.txt": b"same", "c.txt": b"other"})
    assert find_duplicates(inbox) == [["2025/12/b.txt", "2026/03/a.txt"]]
