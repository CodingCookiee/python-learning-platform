import dataclasses

from plp import hidden, raises, test
import solution
from solution import profile


class Clocks:
    """A fake wall clock and CPU clock. Jobs move them forward by working or waiting."""

    def __init__(self):
        self.now = 1_000.0
        self.cpu_used = 20.0

    def wall(self):
        return self.now

    def cpu(self):
        return self.cpu_used

    def work(self, seconds):
        self.now += seconds
        self.cpu_used += seconds

    def wait(self, seconds):
        self.now += seconds


def export_invoices(clocks, month, *, rows=412):
    clocks.wait(11.2)
    clocks.work(0.8)
    return rows


@test("Profiles the invoice export")
def _():
    clocks = Clocks()
    report = profile(export_invoices, clocks, "2026-09", wall_clock=clocks.wall, cpu_clock=clocks.cpu)
    assert report == solution.Profile(result=412, wall_seconds=12.0, cpu_seconds=0.8, kind="io-bound")


@test("Passes keyword arguments through to the job")
def _():
    clocks = Clocks()
    report = profile(export_invoices, clocks, "2026-09", rows=7, wall_clock=clocks.wall, cpu_clock=clocks.cpu)
    assert report.result == 7


@test("A busy job is CPU-bound, and a half-busy one is mixed")
def _():
    clocks = Clocks()

    def thumbnails(count):
        clocks.work(0.01 * count)
        clocks.wait(0.1)
        return count

    assert profile(thumbnails, 500, wall_clock=clocks.wall, cpu_clock=clocks.cpu).kind == "cpu-bound"
    assert profile(lambda: clocks.work(1) or clocks.wait(1), wall_clock=clocks.wall, cpu_clock=clocks.cpu).kind == "mixed"


@test("Profile is a frozen dataclass, rounded to milliseconds")
def _():
    clocks = Clocks()
    report = profile(lambda: clocks.work(0.1) or clocks.wait(0.2), wall_clock=clocks.wall, cpu_clock=clocks.cpu)
    assert (report.wall_seconds, report.cpu_seconds) == (0.3, 0.1)
    assert dataclasses.is_dataclass(solution.Profile) and solution.Profile.__dataclass_params__.frozen, "Profile should be a frozen dataclass"


@hidden("A job that takes no time at all is instant")
def _():
    clocks = Clocks()
    assert profile(lambda: "cached", wall_clock=clocks.wall, cpu_clock=clocks.cpu) == solution.Profile("cached", 0.0, 0.0, "instant")


@hidden("Errors from the job propagate")
def _():
    clocks = Clocks()

    def failing_export():
        clocks.wait(1)
        raise ConnectionError("database went away")

    raises(ConnectionError, profile, failing_export, wall_clock=clocks.wall, cpu_clock=clocks.cpu, match="went away")


@hidden("Uses the real clocks by default")
def _():
    report = profile(sum, [1, 2, 3])
    assert report.result == 6
    assert report.wall_seconds >= 0 and report.cpu_seconds >= 0
