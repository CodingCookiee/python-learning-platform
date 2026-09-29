from itertools import islice

from plp import test, hidden
from solution import RoundRobin


class Queue:
    """A one-pass job queue that counts how many jobs have been taken from it."""

    def __init__(self, jobs):
        self._jobs = iter(jobs)
        self.taken = 0

    def __iter__(self):
        return self

    def __next__(self):
        job = next(self._jobs)
        self.taken += 1
        return job


def endless_queue(customer, limit=1_000):
    """A customer who never stops sending jobs. Refuses to be read to the end."""
    n = 0
    while True:
        if n == limit:
            raise AssertionError(
                f"RoundRobin took {limit:,} jobs from {customer}'s endless queue: it's reading ahead "
                "instead of taking one job at a time"
            )
        n += 1
        yield f"{customer}{n}"


@test("Takes one job from each queue in turn")
def _():
    jobs = RoundRobin(["a1", "a2"], ["b1"], ["c1", "c2", "c3"])
    assert list(jobs) == ["a1", "b1", "c1", "a2", "c2", "c3"]


@test("Is an iterator, and is used up after one pass")
def _():
    jobs = RoundRobin(["a1"], ["b1"])
    assert iter(jobs) is jobs
    assert next(jobs) == "a1"
    assert list(jobs) == ["b1"]
    assert list(jobs) == []


@test("Works with a queue that never ends")
def _():
    jobs = RoundRobin(endless_queue("a"), ["b1", "b2"])
    assert list(islice(jobs, 6)) == ["a1", "b1", "a2", "b2", "a3", "a4"]


@test("Reads nothing until asked, and only one job at a time")
def _():
    first, second = Queue(["a1", "a2", "a3"]), Queue(["b1", "b2", "b3"])
    jobs = RoundRobin(first, second)
    assert (first.taken, second.taken) == (0, 0), "creating a RoundRobin shouldn't take any jobs"
    next(jobs)
    next(jobs)
    next(jobs)
    assert (first.taken, second.taken) == (2, 1)


@hidden("No queues, or only empty ones")
def _():
    assert list(RoundRobin()) == []
    assert list(RoundRobin([], [], [])) == []


@hidden("Keeps going after the early queues run out")
def _():
    jobs = RoundRobin([], ["b1"], iter(["c1", "c2", "c3"]))
    assert list(jobs) == ["b1", "c1", "c2", "c3"]
