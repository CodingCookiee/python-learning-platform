import asyncio

_DONE = object()


class _Failed:
    def __init__(self, error):
        self.error = error


async def merge(*feeds):
    """Yield every item from every feed as it arrives; close the feeds when done."""
    queue = asyncio.Queue()

    async def pump(feed):
        try:
            async for item in feed:
                await queue.put(item)
        except Exception as error:
            await queue.put(_Failed(error))
        else:
            await queue.put(_DONE)

    tasks = [asyncio.create_task(pump(feed)) for feed in feeds]
    try:
        running = len(tasks)
        while running:
            item = await queue.get()
            if item is _DONE:
                running -= 1
            elif isinstance(item, _Failed):
                raise item.error
            else:
                yield item
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
