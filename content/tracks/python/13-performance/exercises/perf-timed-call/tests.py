import inspect
import time

from plp import test, hidden
from solution import timed


def scripted(*readings):
    """A fake clock that returns these readings in order, then complains."""
    remaining = list(readings)

    def clock():
        assert remaining, f"The clock was read more than {len(readings)} times"
        return remaining.pop(0)

    return clock


@test("Returns the result and the time in milliseconds")
def _():
    assert timed(sum, [4, 5, 6], clock=scripted(12.0, 12.25)) == (15, 250.0)


@test("Reads the clock just before and just after the call")
def _():
    events = []

    def clock():
        events.append("clock")
        return 0.0

    def build_report():
        events.append("call")
        return "report"

    timed(build_report, clock=clock)
    assert events == ["clock", "call", "clock"]


@test("Passes every argument through")
def _():
    assert timed(max, 3, 9, 4, clock=scripted(1.0, 1.5)) == (9, 500.0)


@test("Uses time.perf_counter by default")
def _():
    default = inspect.signature(timed).parameters["clock"].default
    assert default is time.perf_counter, "clock should default to time.perf_counter"


@hidden("Works with the real clock")
def _():
    result, elapsed = timed(sorted, [3, 1, 2])
    assert result == [1, 2, 3]
    assert isinstance(elapsed, float) and elapsed >= 0
