import tempfile
from pathlib import Path

from plp import hidden, test
from solution import apply_renames


def make_folder(files):
    folder = Path(tempfile.mkdtemp())
    for name, text in files.items():
        (folder / name).write_text(text)
    return folder


def contents(folder):
    return {p.name: p.read_text() for p in sorted(folder.iterdir())}


@test("Two receipts that clean to the same name both survive")
def _():
    folder = make_folder({"Receipt.JPG": "Tesco", "RECEIPT.jpg": "Shell"})
    assert apply_renames(folder, {"Receipt.JPG": "receipt.jpg", "RECEIPT.jpg": "receipt.jpg"}) == [
        "receipt.jpg",
        "receipt-2.jpg",
    ]
    assert contents(folder) == {"receipt-2.jpg": "Shell", "receipt.jpg": "Tesco"}


@test("Doesn't overwrite a file that was already there")
def _():
    folder = make_folder({"invoice.pdf": "March", "Invoice.PDF": "April"})
    assert apply_renames(folder, {"Invoice.PDF": "invoice.pdf"}) == ["invoice-2.pdf"]
    assert contents(folder) == {"invoice-2.pdf": "April", "invoice.pdf": "March"}


@test("Plain renames still work")
def _():
    folder = make_folder({"Scan 14.pdf": "statement"})
    assert apply_renames(folder, {"Scan 14.pdf": "scan-14.pdf"}) == ["scan-14.pdf"]
    assert contents(folder) == {"scan-14.pdf": "statement"}


@hidden("Keeps counting past -2")
def _():
    folder = make_folder({"a.png": "1", "b.png": "2", "c.png": "3"})
    assert apply_renames(folder, {"a.png": "logo.png", "b.png": "logo.png", "c.png": "logo.png"}) == [
        "logo.png",
        "logo-2.png",
        "logo-3.png",
    ]
    assert sorted(contents(folder).values()) == ["1", "2", "3"]


@hidden("A file renamed to its own name is left alone")
def _():
    folder = make_folder({"notes.txt": "keep"})
    assert apply_renames(folder, {"notes.txt": "notes.txt"}) == ["notes.txt"]
    assert contents(folder) == {"notes.txt": "keep"}
