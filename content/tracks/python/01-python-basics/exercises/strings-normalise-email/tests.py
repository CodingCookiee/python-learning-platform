from plp import test, hidden
from solution import normalise_email


@test("Strips spaces and lowers the case")
def _():
    assert normalise_email("  Ada.Lovelace@Example.COM ") == "ada.lovelace@example.com"


@test("Leaves a clean address unchanged")
def _():
    assert normalise_email("grace@navy.mil") == "grace@navy.mil"


@test("Removes tabs and newlines at the ends")
def _():
    assert normalise_email("\tLin@Example.org\n") == "lin@example.org"


@hidden("Doesn't touch characters in the middle")
def _():
    assert normalise_email(" Ops+Alerts@Example.com") == "ops+alerts@example.com"
