import random

from plp import test, hidden
from solution import draw_winners

TICKETS = {"ada": 3, "grace": 1, "linus": 2, "guido": 5}


@test("The same seed gives the same winners")
def _():
    first = draw_winners(TICKETS, 2, random.Random(7))
    assert first == draw_winners(TICKETS, 2, random.Random(7))
    assert len(first) == 2 and set(first) <= set(TICKETS)


@test("Nobody wins twice")
def _():
    for seed in range(20):
        winners = draw_winners(TICKETS, 4, random.Random(seed))
        assert sorted(winners) == sorted(TICKETS), f"seed {seed} drew {winners}"


@test("Leaves the tickets dict unchanged")
def _():
    tickets = dict(TICKETS)
    draw_winners(tickets, 3, random.Random(1))
    assert tickets == TICKETS


@hidden("Uses only the rng it's given")
def _():
    random.seed(1)
    first = draw_winners(TICKETS, 3, random.Random(99))
    random.seed(2)
    second = draw_winners(TICKETS, 3, random.Random(99))
    assert first == second, "Call methods on rng, not on the random module"


@hidden("More tickets win more often")
def _():
    tickets = {"whale": 90, **{f"entrant{n}": 1 for n in range(10)}}
    wins = sum(draw_winners(tickets, 1, random.Random(seed)) == ["whale"] for seed in range(300))
    assert wins > 200, f"With 90 of 100 tickets, whale won only {wins} of 300 draws"


@hidden("Raises ValueError when k is more than the number of entrants")
def _():
    try:
        draw_winners({"ada": 1}, 2, random.Random(0))
    except ValueError:
        return
    raise AssertionError("draw_winners with k=2 and one entrant should raise ValueError")
