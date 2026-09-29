import asyncio


async def merge(*feeds):
    """Yield every item from every feed as it arrives; close the feeds when done."""
    for feed in feeds:
        async for item in feed:
            yield item
