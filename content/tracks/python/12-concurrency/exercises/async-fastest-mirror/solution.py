import asyncio


async def fastest(mirrors, path):
    """(name, body) from the first mirror to answer successfully; the others are cancelled."""

    async def attempt(mirror):
        return mirror.name, await mirror.get(path)

    tasks = [asyncio.create_task(attempt(mirror)) for mirror in mirrors]
    errors = []
    try:
        for next_done in asyncio.as_completed(tasks):
            try:
                return await next_done
            except Exception as error:
                errors.append(error)
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    raise ExceptionGroup("every mirror failed", errors)
