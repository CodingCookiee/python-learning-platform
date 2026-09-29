from plp import test, hidden, raises
from solution import time_it


def scripted(*readings):
    """A fake clock that returns these readings in order, then complains."""
    remaining = list(readings)

    def clock():
        assert remaining, f"The clock was read more than {len(readings)} times"
        return remaining.pop(0)

    return clock


@test("Returns the best time per call")
def _():
    clock = scripted(0.0, 3.0, 10.0, 12.0, 20.0, 26.0)
    assert time_it(lambda: None, number=2, repeat=3, clock=clock) == 1.0


@test("Calls the function number times in each round")
def _():
    calls = []
    time_it(lambda: calls.append(1), number=4, repeat=3)
    assert len(calls) == 12


@test("Reads the clock only at the start and end of each round")
def _():
    reads = []

    def clock():
        reads.append(1)
        return float(len(reads))

    time_it(lambda: None, number=50, repeat=4, clock=clock)
    assert len(reads) == 8, f"The clock was read {len(reads)} times for 4 rounds; expected 8"


@test("Refuses zero rounds or zero calls")
def _():
    with raises(ValueError, what="time_it(fn, number=0)"):
        time_it(lambda: None, number=0)
    with raises(ValueError, what="time_it(fn, repeat=0)"):
        time_it(lambda: None, repeat=0)


@hidden("Defaults to five rounds of one call")
def _():
    calls = []
    clock = scripted(0.0, 4.0, 5.0, 6.5, 7.0, 7.5, 8.0, 10.0, 11.0, 14.0)
    assert time_it(lambda: calls.append(1), clock=clock) == 0.5
    assert len(calls) == 5


@hidden("Works with the real clock")
def _():
    best = time_it(lambda: sum(range(1_000)), number=10, repeat=3)
    assert isinstance(best, float)
    assert 0 <= best < 1
