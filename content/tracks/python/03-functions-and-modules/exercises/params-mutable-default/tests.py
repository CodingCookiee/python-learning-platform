from plp import test, hidden
from solution import add_tag


@test("Each call without a list starts a new one")
def _():
    assert add_tag("urgent") == ["urgent"]
    assert add_tag("billing") == ["billing"]


@test("Adds to a list you pass in")
def _():
    ticket = ["refund"]
    assert add_tag("urgent", ticket) == ["refund", "urgent"]
    assert ticket == ["refund", "urgent"]


@test("Doesn't add a tag twice")
def _():
    assert add_tag("urgent", ["urgent"]) == ["urgent"]


@hidden("Returns a different list on every call")
def _():
    first = add_tag("vip")
    second = add_tag("vip")
    assert first is not second, "Two calls without a list returned the same list object"
    assert first == ["vip"]


@hidden("Uses an empty list that's passed in")
def _():
    ticket = []
    add_tag("vip", ticket)
    assert ticket == ["vip"], "An empty list passed in should receive the tag (check with `is None`, not truthiness)"


@hidden("Keeps working after many calls")
def _():
    for number in range(5):
        add_tag(f"batch-{number}")
    assert add_tag("final") == ["final"]
