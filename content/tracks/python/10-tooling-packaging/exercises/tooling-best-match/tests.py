from plp import test, hidden, raises
from solution import best_match

RELEASES = ["2.6.4", "2.7.0", "2.10.1", "2.11.3", "3.0.0"]


@test("Picks the newest release in range")
def _():
    assert best_match(RELEASES, ">=2.7,<3") == "2.11.3"
    assert best_match(RELEASES, "~=2.7.0") == "2.7.0"
    assert best_match(RELEASES, "==2.1.*") is None


@test("Compatible release keeps the prefix you wrote")
def _():
    releases = ["2.2.0", "2.2.1", "2.2.9", "2.3.0", "3.1.0"]
    assert best_match(releases, "~=2.2.1") == "2.2.9"
    assert best_match(releases, "~=2.2") == "2.3.0"


@test("Wildcards match whole parts")
def _():
    releases = ["5.1.9", "5.2", "5.2.7", "5.20.1", "6.0"]
    assert best_match(releases, "==5.2.*") == "5.2.7"
    assert best_match(releases, "!=6.*,!=5.20.*") == "5.2.7"


@test("Returns the version as written, whatever order the list is in")
def _():
    assert best_match(["1.10", "1.9.3", "1.2"], "<2") == "1.10"
    assert best_match(["0.9.0", "0.10.0", "0.8.5"], "") == "0.10.0"


@hidden("Combines ~= with other clauses")
def _():
    releases = ["14.0.0", "14.1.0", "14.1.1", "14.2.0", "15.0.0"]
    assert best_match(releases, "~=14.0, !=14.2.0") == "14.1.1"
    assert best_match(releases, ">=14.1, <14.1.1") == "14.1.0"


@hidden("Returns None for an empty list or an impossible range")
def _():
    assert best_match([], ">=1") is None
    assert best_match(RELEASES, ">=3.1, <3") is None


@hidden("Refuses a one-part ~= and unknown operators")
def _():
    raises(ValueError, best_match, RELEASES, "~=2")
    raises(ValueError, best_match, RELEASES, "=>2.7")
