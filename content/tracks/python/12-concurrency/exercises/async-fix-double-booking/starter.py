import asyncio


class SoldOut(Exception):
    pass


class BoxOffice:
    """Sells the seats of one venue."""

    def __init__(self, venue):
        self.venue = venue

    async def book(self, customer):
        """Reserve a seat for the customer, or raise SoldOut."""
        left = await self.venue.seats_left()
        if left == 0:
            raise SoldOut(f"{customer}: sold out")
        await self.venue.reserve(customer)
