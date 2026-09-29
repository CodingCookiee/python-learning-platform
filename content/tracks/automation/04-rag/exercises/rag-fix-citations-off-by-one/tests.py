from plp import hidden, test
from solution import resolve_citations

PROTECTION = {"id": "deposits#0", "title": "Deposit protection", "text": "Your landlord must protect your deposit within 30 days."}
UNPROTECTED = {"id": "deposits#1", "title": "Unprotected deposits", "text": "You can claim up to three times the deposit."}
REPAIRS = {"id": "repairs#0", "title": "Asking for repairs", "text": "Report repairs in writing."}
CHUNKS = [PROTECTION, UNPROTECTED, REPAIRS]


def ids(chunks):
    return [chunk["id"] for chunk in chunks]


@test("Citation [1] is the first source")
def _():
    assert ids(resolve_citations("Your landlord has 30 days to protect it [1].", CHUNKS)) == ["deposits#0"]


@test("The last source can be cited without an IndexError")
def _():
    assert ids(resolve_citations("Put it in writing [3].", CHUNKS)) == ["repairs#0"]


@test("Each source appears once, in the order it's first cited")
def _():
    answer = "Protect it within 30 days [2]... sorry, [1]. Otherwise claim [2]. Also [1]."
    assert ids(resolve_citations(answer, CHUNKS)) == ["deposits#1", "deposits#0"]


@test("Numbers past the end are ignored")
def _():
    assert ids(resolve_citations("See [4] and [1] and [40].", CHUNKS)) == ["deposits#0"]


@hidden("[0] isn't a source either, and never wraps round to the last chunk")
def _():
    assert ids(resolve_citations("As stated [0].", CHUNKS)) == []
    assert resolve_citations("No sources [1].", []) == []
