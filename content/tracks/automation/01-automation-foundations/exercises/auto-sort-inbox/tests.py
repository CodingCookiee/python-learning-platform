import tempfile
from pathlib import Path

from plp import hidden, test
from solution import sort_inbox

RULES = {
    "invoices": [".pdf"],
    "receipts": [".jpg", ".jpeg", ".png"],
    "spreadsheets": [".csv", ".xlsx"],
}


def make_inbox(*names):
    inbox = Path(tempfile.mkdtemp()) / "Inbox"
    inbox.mkdir()
    for name in names:
        (inbox / name).write_text(f"contents of {name}")
    return inbox


def tree(inbox):
    return sorted(p.relative_to(inbox).as_posix() for p in inbox.rglob("*") if p.is_file())


@test("Returns the plan for three files")
def _():
    inbox = make_inbox("march.pdf", "IMG_4411.JPG", "notes.txt")
    assert sort_inbox(inbox, RULES) == [("IMG_4411.JPG", "receipts"), ("march.pdf", "invoices"), ("notes.txt", "other")]


@test("Moves each file into its folder")
def _():
    inbox = make_inbox("march.pdf", "IMG_4411.JPG", "notes.txt")
    sort_inbox(inbox, RULES)
    assert tree(inbox) == ["invoices/march.pdf", "other/notes.txt", "receipts/IMG_4411.JPG"]
    assert (inbox / "invoices" / "march.pdf").read_text() == "contents of march.pdf"


@test("A dry run plans but moves nothing and creates no folders")
def _():
    inbox = make_inbox("orders.CSV", "logo.png")
    assert sort_inbox(inbox, RULES, dry_run=True) == [("logo.png", "receipts"), ("orders.CSV", "spreadsheets")]
    assert sorted(p.name for p in inbox.iterdir()) == ["logo.png", "orders.CSV"]


@test("Leaves subfolders and hidden files alone")
def _():
    inbox = make_inbox("april.pdf", ".DS_Store")
    (inbox / "invoices").mkdir()
    (inbox / "invoices" / "march.pdf").write_text("last week")
    assert sort_inbox(inbox, RULES) == [("april.pdf", "invoices")]
    assert tree(inbox) == [".DS_Store", "invoices/april.pdf", "invoices/march.pdf"]


@hidden("Creates only the folders it needs")
def _():
    inbox = make_inbox("scan.jpeg")
    sort_inbox(inbox, RULES)
    assert sorted(p.name for p in inbox.iterdir()) == ["receipts"]


@hidden("An empty inbox plans nothing")
def _():
    assert sort_inbox(make_inbox(), RULES) == []
