import asyncio

from plp import hidden, raises, test
from solution import cheapest_quote

PARCEL = {"weight_kg": 1.2, "to": "EH1 1YZ"}


class Courier:
    """A fake courier API: answers with `price` after `delay` seconds, or raises `error`."""

    def __init__(self, name, price, delay=0.01, error=None, tracker=None):
        self.name = name
        self.price = price
        self.delay = delay
        self.error = error
        self.tracker = tracker if tracker is not None else Tracker()
        self.cancelled = False

    async def quote(self, parcel):
        self.tracker.enter()
        try:
            await asyncio.sleep(self.delay)
        except asyncio.CancelledError:
            self.cancelled = True
            raise
        finally:
            self.tracker.leave()
        if self.error:
            raise self.error
        return self.price


class Tracker:
    """Counts how many quote requests are in flight at once."""

    def __init__(self):
        self.in_flight = 0
        self.peak = 0

    def enter(self):
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)

    def leave(self):
        self.in_flight -= 1


@test("Offers the cheapest quote that arrives in time")
async def _():
    couriers = [
        Courier("parcelnet", 5.10),
        Courier("swiftpost", 4.20, delay=0.02),
        Courier("royal_express", 3.99, delay=1.0),
    ]
    assert await cheapest_quote(couriers, PARCEL, seconds=0.1) == ("swiftpost", 4.2)


@test("Doesn't wait for slow couriers")
async def _():
    couriers = [Courier("parcelnet", 5.10), Courier("royal_express", 3.99, delay=1.0)]
    loop = asyncio.get_running_loop()
    start = loop.time()
    await cheapest_quote(couriers, PARCEL, seconds=0.05)
    elapsed = loop.time() - start
    assert elapsed < 0.3, f"it took {elapsed:.2f} s; the time limit was 0.05 s"


@test("Asks every courier at once, and skips one that fails")
async def _():
    tracker = Tracker()
    couriers = [
        Courier("parcelnet", 5.10, tracker=tracker),
        Courier("swiftpost", 2.00, error=ConnectionError("503 Service Unavailable"), tracker=tracker),
        Courier("dpx", 4.75, tracker=tracker),
    ]
    assert await cheapest_quote(couriers, PARCEL, seconds=0.1) == ("dpx", 4.75)
    assert tracker.peak == 3, f"at most {tracker.peak} quote request(s) were in flight at once"


@test("Raises LookupError when nobody answers")
async def _():
    couriers = [Courier("parcelnet", 5.10, delay=1.0), Courier("dpx", 4.75, error=ConnectionError("refused"))]
    with raises(LookupError, match="no shipping quotes", what="cheapest_quote(couriers, PARCEL, seconds=0.05)"):
        await cheapest_quote(couriers, PARCEL, seconds=0.05)


@hidden("A tie goes to the courier listed first")
async def _():
    couriers = [Courier("dpx", 4.75, delay=0.03), Courier("parcelnet", 4.75, delay=0.0)]
    assert await cheapest_quote(couriers, PARCEL, seconds=0.1) == ("dpx", 4.75)


@hidden("A courier that runs out of time is cancelled, not left running")
async def _():
    slow = Courier("royal_express", 3.99, delay=1.0)
    await cheapest_quote([Courier("parcelnet", 5.10), slow], PARCEL, seconds=0.05)
    assert slow.cancelled, "the slow courier's request should have been cancelled"
