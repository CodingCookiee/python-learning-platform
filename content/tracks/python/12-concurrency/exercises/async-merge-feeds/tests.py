import asyncio
import contextlib
from contextlib import aclosing

from plp import hidden, raises, test
from solution import merge


@contextlib.asynccontextmanager
async def finishes_within(seconds):
    """Fail the test, instead of hanging, if the block is still running after `seconds`."""
    try:
        async with asyncio.timeout(seconds):
            yield
    except TimeoutError:
        raise AssertionError(f"merge was still running after {seconds} s") from None


class Feeds:
    """Builds fake event feeds and records which ones were closed."""

    def __init__(self):
        self.closed = set()

    async def feed(self, name, schedule, error=None):
        """Yield each (delay, event) pair after its delay; optionally raise at the end."""
        try:
            for delay, event in schedule:
                await asyncio.sleep(delay)
                yield event
            if error:
                raise error
        finally:
            self.closed.add(name)


async def collect(events):
    return [event async for event in events]


@test("Yields events in the order they arrive")
async def _():
    feeds = Feeds()
    payments = feeds.feed("payments", [(0.01, "pay-1"), (0.05, "pay-2")])
    refunds = feeds.feed("refunds", [(0.03, "ref-1")])
    async with finishes_within(1):
        assert await collect(merge(payments, refunds)) == ["pay-1", "ref-1", "pay-2"]


@test("Reads the feeds at the same time")
async def _():
    feeds = Feeds()
    schedules = [[(0.03, f"{name}-{n}") for n in range(3)] for name in ("pay", "ref", "cb")]
    loop = asyncio.get_running_loop()
    start = loop.time()
    async with finishes_within(1):
        events = await collect(merge(*(feeds.feed(str(i), s) for i, s in enumerate(schedules))))
    elapsed = loop.time() - start
    assert sorted(events) == sorted(event for schedule in schedules for _, event in schedule)
    assert elapsed < 0.2, f"it took {elapsed:.2f} s; read one after another the feeds take 0.27 s, together 0.09 s"


@test("Closing it early closes every feed")
async def _():
    feeds = Feeds()
    payments = feeds.feed("payments", [(0.01, "pay-1"), (1, "pay-2")])
    refunds = feeds.feed("refunds", [(1, "ref-1")])
    async with finishes_within(1):
        async with aclosing(merge(payments, refunds)) as events:
            async for event in events:
                break
    assert event == "pay-1"
    assert feeds.closed == {"payments", "refunds"}, f"closed: {sorted(feeds.closed)}"


@hidden("A feed that fails stops the merge with its error, and closes the others")
async def _():
    feeds = Feeds()
    payments = feeds.feed("payments", [(0.01, "pay-1")], error=ConnectionError("payments stream dropped"))
    refunds = feeds.feed("refunds", [(1, "ref-1")])
    async with finishes_within(1):
        with raises(ConnectionError, match="dropped", what="merge(payments, refunds)"):
            await collect(merge(payments, refunds))
    assert feeds.closed == {"payments", "refunds"}


@hidden("No feeds, or empty feeds, yield nothing")
async def _():
    feeds = Feeds()
    async with finishes_within(1):
        assert await collect(merge()) == []
        assert await collect(merge(feeds.feed("a", []), feeds.feed("b", []))) == []
