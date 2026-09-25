from plp import test, hidden
from solution import unique_tags


@test("Removes duplicates and sorts the tags")
def _():
    assert unique_tags(["python", "web", "python", "api", "web"]) == ["api", "python", "web"]


@test("Returns a list")
def _():
    result = unique_tags(["web", "api"])
    assert type(result) is list, f"unique_tags returned a {type(result).__name__}, expected a list"


@test("Returns an empty list for no tags")
def _():
    assert unique_tags([]) == []


@hidden("Leaves the original tags unchanged")
def _():
    tags = ["web", "api", "web"]
    unique_tags(tags)
    assert tags == ["web", "api", "web"]
