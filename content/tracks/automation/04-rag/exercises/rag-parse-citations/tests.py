from plp import hidden, test
from solution import parse_citations


@test("Finds single, grouped and adjacent citations")
def _():
    assert parse_citations("You have 30 days [1]. You can claim up to three times the deposit [2, 1][4].") == [1, 2, 4]


@test("Handles numbers with more than one digit, and returns ints")
def _():
    assert parse_citations("See the notice rules [12] and the deposit rules [3].") == [12, 3]


@test("An answer with no citations gives an empty list")
def _():
    assert parse_citations("I can't find that in the documents I have.") == []


@hidden("Ignores brackets that aren't citations, and the number 0")
def _():
    assert parse_citations("[see below] Rent is due monthly [1a] [0] [2] [ 3 ]") == [2]
    assert parse_citations("Two months' notice [2,5] and [5 , 6].") == [2, 5, 6]
