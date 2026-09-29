from plp import test, hidden
from solution import race

LATENCIES = [0.31, 0.02, 0.18, 0.27, 0.05]


class Ticker:
    """A fake clock. Candidates move it forward to say how long they "took"."""

    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


@test("Every run sees the data in its original order")
def _():
    seen = []

    def in_place(data):
        seen.append(list(data))
        data.sort()

    def copying(data):
        seen.append(list(data))
        return sorted(data)

    race({"in place": in_place, "sorted": copying}, list(LATENCIES), repeat=3, clock=Ticker())
    wrong = [run for run in seen if run != LATENCIES]
    assert wrong == [], f"{len(wrong)} of {len(seen)} runs were handed data that wasn't in its original order"


@test("Leaves the caller's data alone")
def _():
    latencies = list(LATENCIES)
    race({"sorted": sorted, "in place": list.sort}, latencies, repeat=2)
    assert latencies == LATENCIES


@test("Returns the best time for each candidate, fastest first")
def _():
    clock = Ticker()
    costs = {"regex": iter([5.0, 4.0, 6.0]), "split": iter([2.0, 1.0, 3.0])}

    def candidate(name):
        def run(data):
            clock.now += next(costs[name])

        return run

    result = race({"regex": candidate("regex"), "split": candidate("split")}, [1, 2, 3], repeat=3, clock=clock)
    assert result == {"split": 1.0, "regex": 4.0}
    assert list(result) == ["split", "regex"]


@test("Copying the data isn't counted in the time")
def _():
    class TrackedList(list):
        """Every copy made by iterating, slicing or .copy() moves the clock on by one second."""

        copies = 0

        def __iter__(self):
            TrackedList.copies += 1
            return super().__iter__()

        def __getitem__(self, index):
            if isinstance(index, slice):
                TrackedList.copies += 1
            return super().__getitem__(index)

        def copy(self):
            TrackedList.copies += 1
            return super().copy()

    def copy_clock():
        return float(TrackedList.copies)

    result = race({"noop": lambda data: None, "len": len}, TrackedList(LATENCIES), repeat=3, clock=copy_clock)
    assert result == {"noop": 0.0, "len": 0.0}, "The copy is being made after the clock has started"


@hidden("Works with the real clock")
def _():
    result = race({"sorted": sorted, "in place": list.sort}, list(range(2_000, 0, -1)), repeat=3)
    assert sorted(result) == ["in place", "sorted"]
    assert all(isinstance(t, float) and t >= 0 for t in result.values())
