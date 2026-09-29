from plp import test, hidden, raises
from solution import timed


class FakeClock:
    """Returns the given readings in order, and counts how often it was read."""

    def __init__(self, *readings):
        self._readings = iter(readings)
        self.reads = 0

    def __call__(self):
        self.reads += 1
        return next(self._readings)


def nightly_export():
    """Export yesterday's orders."""
    return "exported"


@test("Times each call and keeps stats")
def _():
    export = timed(nightly_export, clock=FakeClock(0.0, 1.5, 10.0, 10.25))
    assert (export(), export()) == ("exported", "exported")
    assert export.stats == {"calls": 2, "total": 1.75, "slowest": 1.5}
    assert export.slow_calls == ["nightly_export took 1.50s"]


@test("Reads the clock twice per call")
def _():
    clock = FakeClock(0.0, 0.5)
    export = timed(nightly_export, clock=clock)
    export()
    assert clock.reads == 2


@test("Keeps the name and docstring")
def _():
    export = timed(nightly_export, clock=FakeClock())
    assert export.__name__ == "nightly_export"
    assert export.__doc__ == "Export yesterday's orders."


@test("A call that raises is still timed, and still raises")
def _():
    def sync_crm(batch):
        raise ConnectionError("CRM unavailable")

    sync = timed(sync_crm, clock=FakeClock(5.0, 7.0), threshold=1.0)
    raises(ConnectionError, sync, ["C1"])
    assert sync.stats == {"calls": 1, "total": 2.0, "slowest": 2.0}
    assert sync.slow_calls == ["sync_crm took 2.00s"]


@hidden("A custom threshold, and a call exactly at it isn't slow")
def _():
    def build_report(month, *, currency="GBP"):
        return f"{month} report in {currency}"

    report = timed(build_report, clock=FakeClock(0.0, 0.5, 1.0, 1.75), threshold=0.5)
    assert report("2026-09", currency="EUR") == "2026-09 report in EUR"
    report("2026-10")
    assert report.slow_calls == ["build_report took 0.75s"]


@hidden("Works as a plain @timed with the real clock")
def _():
    @timed
    def health_check():
        return "ok"

    assert health_check() == "ok"
    assert health_check.stats["calls"] == 1
    assert 0 <= health_check.stats["total"] < 1
    assert health_check.slow_calls == []


@hidden("Each decorated function has its own stats")
def _():
    first = timed(nightly_export, clock=FakeClock(0.0, 1.0))
    second = timed(nightly_export, clock=FakeClock(0.0, 2.0))
    first()
    assert second.stats["calls"] == 0
