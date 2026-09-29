from plp import test, hidden, raises
from solution import import_customers

ADA = {"name": "Ada Lovelace", "email": "ada@example.com", "age": "36"}
CLEAN_ADA = {"name": "Ada Lovelace", "email": "ada@example.com", "age": 36}


@test("Keeps the good record and lists every problem with the bad ones")
def _():
    records = [
        ADA,
        {"name": "", "email": "grace.example.com", "age": "40"},
        {"name": "Linus", "email": "linus@example.org", "age": "twelve"},
    ]
    assert import_customers(records) == (
        [CLEAN_ADA],
        ["row 2: name is required", "row 2: email must contain @", "row 3: age must be a whole number"],
    )


@test("Carries on after a bad record")
def _():
    records = [{"name": "", "email": "", "age": ""}, ADA]
    accepted, rejected = import_customers(records)
    assert accepted == [CLEAN_ADA]
    assert len(rejected) == 3


@test("A record that isn't a dict still stops the import")
def _():
    raises(TypeError, import_customers, [ADA, ["Grace", "grace@example.com", "40"]], match="must be a dict")


@hidden("A clean file has no rejects")
def _():
    grace = {"name": "Grace", "email": "GRACE@EXAMPLE.COM", "age": "85"}
    assert import_customers([ADA, grace]) == (
        [CLEAN_ADA, {"name": "Grace", "email": "grace@example.com", "age": 85}],
        [],
    )


@hidden("An empty file gives empty results")
def _():
    assert import_customers([]) == ([], [])
