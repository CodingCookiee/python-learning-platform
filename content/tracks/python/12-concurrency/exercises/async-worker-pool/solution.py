import asyncio


async def process_all(jobs, handle, *, workers):
    """Run handle(job) for every job on a pool of `workers` tasks; results in job order."""
    queue = asyncio.Queue()
    for index, job in enumerate(jobs):
        queue.put_nowait((index, job))
    results = [None] * len(jobs)

    async def worker():
        while True:
            try:
                index, job = queue.get_nowait()
            except asyncio.QueueEmpty:
                return
            results[index] = await handle(job)

    async with asyncio.TaskGroup() as group:
        for _ in range(workers):
            group.create_task(worker())
    return results
