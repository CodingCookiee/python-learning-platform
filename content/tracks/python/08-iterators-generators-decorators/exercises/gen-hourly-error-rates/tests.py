import inspect
from datetime import datetime, timedelta

from plp import test, hidden
from solution import hourly_error_rates


class Log:
    """A one-pass log that counts the lines read from it."""

    def __init__(self, lines):
        self._lines = iter(lines)
        self.read = 0

    def __iter__(self):
        return self

    def __next__(self):
        line = next(self._lines)
        self.read += 1
        return line


def live_log(limit=20_000):
    """A request every 30 seconds, one in ten failing. It never ends."""
    start = datetime(2026, 9, 28, 0, 0)
    for n in range(limit):
        at = start + timedelta(seconds=30 * n)
        yield f"{at.isoformat()} /page {503 if n % 10 == 0 else 200}"
    raise AssertionError(
        f"Read {limit:,} lines of a log that never ends: each hour should be yielded as soon as it's finished"
    )


@test("Yields one tuple per hour")
def _():
    log = [
        "2026-09-28T09:15:02 /pay 502",
        "2026-09-28T09:40:10 /home 200",
        "2026-09-28T09:59:59 /cart 200",
        "2026-09-28T10:01:00 /pay 200",
    ]
    assert list(hourly_error_rates(log)) == [
        (datetime(2026, 9, 28, 9, 0), 3, 1, 0.333),
        (datetime(2026, 9, 28, 10, 0), 1, 0, 0.0),
    ]


@test("Is a generator function")
def _():
    assert inspect.isgeneratorfunction(hourly_error_rates), "hourly_error_rates should use yield"


@test("Works on a log that never ends")
def _():
    rates = hourly_error_rates(live_log())
    assert next(rates) == (datetime(2026, 9, 28, 0, 0), 120, 12, 0.1)
    assert next(rates) == (datetime(2026, 9, 28, 1, 0), 120, 12, 0.1)


@test("Yields an hour as soon as the next one starts")
def _():
    log = Log([
        "2026-09-28T09:00:00 /a 200",
        "2026-09-28T09:30:00 /b 500",
        "2026-09-28T10:00:00 /c 200",
        "2026-09-28T10:10:00 /d 200",
    ])
    assert next(hourly_error_rates(log)) == (datetime(2026, 9, 28, 9, 0), 2, 1, 0.5)
    assert log.read == 3, f"it read {log.read} lines to finish the first hour; it only needs 3"


@hidden("Skips malformed lines")
def _():
    log = ["2026-09-28T09:00:00 /a 200", "garbage", "2026-09-28T09:05:00 /b", "2026-09-28T09:10:00 /c 504"]
    assert list(hourly_error_rates(log)) == [(datetime(2026, 9, 28, 9, 0), 2, 1, 0.5)]


@hidden("Hours with no requests don't appear, and an empty log yields nothing")
def _():
    log = ["2026-09-28T09:00:00 /a 200", "2026-09-28T13:00:00 /b 500"]
    assert [row[0].hour for row in hourly_error_rates(log)] == [9, 13]
    assert list(hourly_error_rates([])) == []
