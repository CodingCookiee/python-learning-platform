from plp import test, hidden
from solution import index_by_email


@test("Maps each normalised email to its user ID")
def _():
    assert index_by_email({101: "Ada@Example.com", 102: " grace@example.com "}) == {
        "ada@example.com": 101,
        "grace@example.com": 102,
    }


@test("Returns an empty dict when there are no users")
def _():
    assert index_by_email({}) == {}


@test("Leaves the users dict unchanged")
def _():
    users = {101: "Ada@Example.com"}
    index_by_email(users)
    assert users == {101: "Ada@Example.com"}


@hidden("Keeps the users' order")
def _():
    result = index_by_email({7: "ken@example.com", 3: "BARBARA@example.com", 5: "linus@example.com"})
    assert list(result) == ["ken@example.com", "barbara@example.com", "linus@example.com"]
