from plp import test, hidden
from solution import declined, first_declines, parse_payments


class Feed:
    """A one-pass payment feed that counts the lines read from it."""

    def __init__(self, lines):
        self._lines = iter(lines)
        self.read = 0

    def __iter__(self):
        return self

    def __next__(self):
        line = next(self._lines)
        self.read += 1
        return line


def live_feed(limit=5_000):
    """The live payment feed: every seventh payment is declined. It never ends."""
    for n in range(limit):
        status = "declined" if n % 7 == 6 else "approved"
        yield f"2026-09-28T09:{n // 60 % 60:02d}:{n % 60:02d},A{n},{500 + n},{status}"
    raise AssertionError(
        f"Read {limit:,} lines of a live feed that never ends: the pipeline should stop once it has found n declines"
    )


@test("Finds the first declined payment")
def _():
    feed = ["2026-09-28T09:00:01,A1,1250,approved", "2026-09-28T09:00:04,A2,899,declined"]
    assert first_declines(feed, 1) == ["A2"]


@test("Works on the live feed")
def _():
    assert first_declines(live_feed(), 3) == ["A6", "A13", "A20"]


@test("Reads only as far as it needs to")
def _():
    feed = Feed([
        "2026-09-28T09:00:01,A1,1250,declined",
        "2026-09-28T09:00:02,A2,899,approved",
        "2026-09-28T09:00:03,A3,4000,declined",
        "2026-09-28T09:00:04,A4,120,declined",
    ])
    assert first_declines(feed, 2) == ["A1", "A3"]
    assert feed.read == 3, f"it read {feed.read} lines; it only needed 3"


@hidden("parse_payments still produces the same dicts")
def _():
    payments = parse_payments(iter(["2026-09-28T09:00:01,A1,1250,approved"]))
    assert list(payments) == [{"order_id": "A1", "amount": 1250, "status": "approved", "at": "2026-09-28T09:00:01"}]


@hidden("declined still filters, lazily")
def _():
    found = declined(iter([{"status": "approved"}, {"status": "declined", "order_id": "A9"}]))
    assert iter(found) is found, "declined(...) should return an iterator, not a list"
    assert list(found) == [{"status": "declined", "order_id": "A9"}]


@hidden("Fewer declines than asked for")
def _():
    feed = ["2026-09-28T09:00:01,A1,1250,approved", "2026-09-28T09:00:04,A2,899,declined"]
    assert first_declines(feed, 5) == ["A2"]
