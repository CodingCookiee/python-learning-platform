from plp import test, hidden
from solution import leaderboard

SCORES = {"mo": 40, "ada": 55, "kim": 40, "sam": 12}


@test("Ranks players by points, ties alphabetically")
def _():
    assert leaderboard(SCORES) == ["ada", "kim", "mo", "sam"]


@test("Cuts the list to top")
def _():
    assert leaderboard(SCORES, top=2) == ["ada", "kim"]


@test("Breaks a three-way tie alphabetically")
def _():
    assert leaderboard({"zoe": 7, "abe": 7, "lou": 7}) == ["abe", "lou", "zoe"]


@hidden("top=0 gives an empty list")
def _():
    assert leaderboard(SCORES, top=0) == []


@hidden("top larger than the number of players gives everyone")
def _():
    assert leaderboard(SCORES, top=10) == ["ada", "kim", "mo", "sam"]


@hidden("No players gives an empty list")
def _():
    assert leaderboard({}) == []


@hidden("Doesn't change the scores dict")
def _():
    scores = {"b": 1, "a": 2}
    leaderboard(scores)
    assert scores == {"b": 1, "a": 2}
    assert list(scores) == ["b", "a"]
