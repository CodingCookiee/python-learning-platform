import random


def draw_winners(tickets, k, rng):
    """k distinct winners, each draw weighted by tickets, using rng for every choice."""
    if k > len(tickets):
        raise ValueError(f"can't draw {k} winners from {len(tickets)} entrants")
    remaining = dict(tickets)
    winners = []
    for _ in range(k):
        names = list(remaining)
        [winner] = rng.choices(names, weights=[remaining[name] for name in names])
        winners.append(winner)
        del remaining[winner]
    return winners
