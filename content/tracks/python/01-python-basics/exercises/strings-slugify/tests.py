from plp import test, hidden, source_uses
from solution import slugify


@test("Slugifies a title with extra spaces")
def _():
    assert slugify("  Summer   Sale 2026 ") == "summer-sale-2026"


@test("Treats tabs and newlines as whitespace")
def _():
    assert slugify("New\tarrivals\n") == "new-arrivals"


@test("Uses split() and join()")
def _():
    assert source_uses(call="split") and source_uses(call="join"), (
        "Build the slug with split() and join() instead of a chain of replace() calls"
    )


@hidden("Collapses long runs of spaces")
def _():
    assert slugify("Back    to     school") == "back-to-school"


@hidden("Handles a single word")
def _():
    assert slugify("  Clearance ") == "clearance"


@hidden("Returns an empty slug for a blank title")
def _():
    assert slugify("   ") == ""
