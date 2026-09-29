import asyncio

from plp import hidden, test
from solution import BoxOffice, SoldOut


class Traffic:
    """Shared by fake venues: how many venue calls are in progress at once, across all venues."""

    def __init__(self):
        self.active = 0
        self.peak = 0


class Venue:
    """A fake ticketing API. Each call takes 10 ms, like a real round trip."""

    def __init__(self, seats, traffic=None):
        self.seats = seats
        self.reserved = []
        self.traffic = traffic or Traffic()

    async def _call(self):
        self.traffic.active += 1
        self.traffic.peak = max(self.traffic.peak, self.traffic.active)
        await asyncio.sleep(0.01)
        self.traffic.active -= 1

    async def seats_left(self):
        await self._call()
        return self.seats - len(self.reserved)

    async def reserve(self, customer):
        await self._call()
        self.reserved.append(customer)


async def rush(office, fans):
    return await asyncio.gather(*(office.book(fan) for fan in fans), return_exceptions=True)


FANS = [f"fan-{n}" for n in range(1, 11)]


@test("Ten fans, three seats: three tickets")
async def _():
    venue = Venue(seats=3)
    await rush(BoxOffice(venue), FANS)
    assert venue.reserved == ["fan-1", "fan-2", "fan-3"]


@test("Everyone else gets SoldOut, with their name")
async def _():
    outcomes = await rush(BoxOffice(Venue(seats=3)), FANS)
    refused = [str(outcome) for outcome in outcomes if isinstance(outcome, SoldOut)]
    assert refused == [f"fan-{n}: sold out" for n in range(4, 11)]


@test("Bookings at different venues don't wait for each other")
async def _():
    traffic = Traffic()
    arena, club = Venue(seats=5, traffic=traffic), Venue(seats=5, traffic=traffic)
    await asyncio.gather(BoxOffice(arena).book("ada"), BoxOffice(club).book("grace"))
    assert traffic.peak == 2, "a booking at one venue waited for a booking at another"


@hidden("One at a time still works, until the venue is full")
async def _():
    venue = Venue(seats=1)
    office = BoxOffice(venue)
    await office.book("linus")
    try:
        await office.book("guido")
    except SoldOut as error:
        assert "guido" in str(error)
    else:
        raise AssertionError("the second booking should raise SoldOut")
    assert venue.reserved == ["linus"]


@hidden("Two rushes at once on two venues each sell exactly their seats")
async def _():
    small, large = Venue(seats=2), Venue(seats=4)
    await asyncio.gather(rush(BoxOffice(small), FANS), rush(BoxOffice(large), FANS))
    assert (len(small.reserved), len(large.reserved)) == (2, 4)
