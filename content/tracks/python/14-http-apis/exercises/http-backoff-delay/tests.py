import random

from plp import hidden, test
from solution import backoff_delay


class Top:
    """A fake random source: uniform() returns the upper bound, and records every call."""

    def __init__(self):
        self.calls = []

    def uniform(self, low, high):
        self.calls.append((low, high))
        return high


top = Top()


@test("Doubles from the base, up to the cap")
def _():
    assert backoff_delay(0, rng=top) == 0.5
    assert backoff_delay(3, rng=top) == 4.0
    assert backoff_delay(10, rng=top) == 30.0


@test("Asks the random source for a delay between 0 and the ceiling")
def _():
    rng = Top()
    [backoff_delay(attempt, rng=rng) for attempt in range(8)]
    assert rng.calls == [(0, 0.5), (0, 1.0), (0, 2.0), (0, 4.0), (0, 8.0), (0, 16.0), (0, 30.0), (0, 30.0)]


@test("Uses the base and cap it's given")
def _():
    rng = Top()
    assert [backoff_delay(attempt, base=2, cap=10, rng=rng) for attempt in range(4)] == [2, 4, 8, 10]


@hidden("A seeded Random gives the same delays every time")
def _():
    first = [backoff_delay(attempt, rng=random.Random(42)) for attempt in range(6)]
    second = [backoff_delay(attempt, rng=random.Random(42)) for attempt in range(6)]
    assert first == second
    expected_rng = random.Random(42)
    assert backoff_delay(4, rng=random.Random(42)) == expected_rng.uniform(0, 8.0)


@hidden("The default random module stays within range")
def _():
    delays = [backoff_delay(5) for _ in range(200)]
    assert all(0 <= delay <= 16.0 for delay in delays)
    assert len(set(delays)) > 1, "Delays should vary"
