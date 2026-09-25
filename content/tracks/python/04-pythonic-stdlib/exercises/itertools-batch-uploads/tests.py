from plp import test, hidden
from solution import upload_requests

CONTACTS = ["ada@example.com", "grace@example.com", "linus@example.com"]


@test("Splits three contacts into batches of two")
def _():
    assert upload_requests(CONTACTS, 2) == [
        {"batch": 1, "rows": ["ada@example.com", "grace@example.com"]},
        {"batch": 2, "rows": ["linus@example.com"]},
    ]


@test("Makes full batches when the rows divide evenly")
def _():
    result = upload_requests(["r1", "r2", "r3", "r4"], 2)
    assert [request["rows"] for request in result] == [["r1", "r2"], ["r3", "r4"]]


@test("Returns no requests for no rows")
def _():
    assert upload_requests([], 100) == []


@hidden("Reads a one-pass iterator")
def _():
    assert upload_requests(iter(CONTACTS), 2)[1] == {"batch": 2, "rows": ["linus@example.com"]}


@hidden("Sends one batch when size is larger than the number of rows")
def _():
    assert upload_requests(CONTACTS, 500) == [{"batch": 1, "rows": CONTACTS}]
