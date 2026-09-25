from plp import test, hidden, source_uses
from solution import group_by_extension


@test("Groups file names by extension")
def _():
    paths = ["reports/q3.CSV", "notes.txt", "archive/q2.csv", "README"]
    assert group_by_extension(paths) == {"csv": ["q2.csv", "q3.CSV"], "txt": ["notes.txt"], "": ["README"]}


@test("Drops the folders from each name")
def _():
    assert group_by_extension(["2026/09/invoice-1042.pdf"]) == {"pdf": ["invoice-1042.pdf"]}


@test("An empty list gives an empty dict")
def _():
    assert group_by_extension([]) == {}


@hidden("Only the last extension counts")
def _():
    assert group_by_extension(["backup.tar.gz", "site.gz"]) == {"gz": ["backup.tar.gz", "site.gz"]}


@hidden("Sorts the names in each group")
def _():
    assert group_by_extension(["c.png", "a.png", "b.PNG"]) == {"png": ["a.png", "b.PNG", "c.png"]}


@hidden("Uses pathlib.Path")
def _():
    assert source_uses(call="Path"), "Use Path from the pathlib module to split the paths"
