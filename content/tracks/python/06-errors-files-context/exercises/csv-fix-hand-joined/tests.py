import csv
import tempfile
from pathlib import Path

from plp import test, hidden
from solution import write_contacts

CONTACTS = [
    {"name": "Ada Lovelace", "email": "ada@example.com", "city": "London"},
    {"name": "Hopper, Grace", "email": "grace@example.com", "city": "Arlington, VA"},
    {"name": 'Margaret "Maggie" Hamilton', "email": "maggie@example.com", "city": "Boston"},
]


def exported(contacts):
    """Export contacts to a fresh file and return its path."""
    path = Path(tempfile.mkdtemp()) / "contacts.csv"
    write_contacts(path, contacts)
    return path


def read_back(path):
    """The header and rows of the file, read the way the mailing tool reads it."""
    with open(path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        return reader.fieldnames, list(reader)


@test("Reads back exactly the contacts that were written")
def _():
    header, rows = read_back(exported(CONTACTS))
    assert rows == CONTACTS


@test("Every row has exactly three columns")
def _():
    with open(exported(CONTACTS), newline="", encoding="utf-8") as file:
        widths = [len(row) for row in csv.reader(file)]
    assert widths == [3, 3, 3, 3]


@test("The header is name, email, city")
def _():
    header, rows = read_back(exported(CONTACTS[:1]))
    assert header == ["name", "email", "city"]


@hidden("Keeps accented names intact")
def _():
    contacts = [{"name": "Chloé Dubois", "email": "chloe@example.fr", "city": "Montréal"}]
    header, rows = read_back(exported(contacts))
    assert rows == contacts


@hidden("An empty contact list writes just the header")
def _():
    path = exported([])
    header, rows = read_back(path)
    assert header == ["name", "email", "city"]
    assert rows == []
