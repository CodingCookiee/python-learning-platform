from plp import test, hidden, source_avoids, source_uses
from solution import leaderboard


@test("Builds the same leaderboard lines")
def _():
    assert leaderboard(["Ada", "Grace", "Linus"], [91, 88, 72]) == [
        "1. Ada - 91 points",
        "2. Grace - 88 points",
        "3. Linus - 72 points",
    ]


@test("Returns no lines for an empty quiz")
def _():
    assert leaderboard([], []) == []


@test("Walks the lists with zip and enumerate")
def _():
    assert source_uses(call="zip"), "Pair each name with its score using zip(names, scores)"
    assert source_uses(call="enumerate"), "Number the lines with enumerate(..., start=1)"


@test("Has no range(len(...)) or indexing left")
def _():
    assert source_avoids(call="range"), "Remove the range(...) loop"
    assert source_avoids(call="len"), "You don't need len() once zip and enumerate do the work"
    assert source_avoids(node="Subscript"), "Remove the names[i] and scores[i] indexing"


@hidden("Handles a single player")
def _():
    assert leaderboard(["Margaret"], [100]) == ["1. Margaret - 100 points"]
