import asyncio


async def process_all(jobs, handle, *, workers):
    """Run handle(job) for every job on a pool of `workers` tasks; results in job order."""
    ...
