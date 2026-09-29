import asyncio
from dataclasses import dataclass, field


@dataclass
class Job:
    id: str
    payload: dict
    attempts: int = 0


@dataclass
class DeadLetter:
    job: Job
    error: str


@dataclass
class RunReport:
    results: dict = field(default_factory=dict)  # job id -> what handle returned
    dead_letters: list = field(default_factory=list)  # DeadLetter, in the order they died


def is_retryable(error):
    if isinstance(error, TimeoutError):
        return True
    status = getattr(error, "status", None)
    return status == 429 or (status is not None and status >= 500)


async def run_jobs(jobs, handle, *, workers=3, max_attempts=3, timeout=30.0, backoff=1.0, sleep=asyncio.sleep):
    """Process every job with a pool of workers, retrying what can succeed and dead-lettering the rest."""
    queue: asyncio.Queue[Job] = asyncio.Queue()
    for job in jobs:
        queue.put_nowait(job)
    report = RunReport()

    async def worker():
        while True:
            job = await queue.get()
            try:
                job.attempts += 1
                try:
                    async with asyncio.timeout(timeout):
                        report.results[job.id] = await handle(job.payload)
                except Exception as error:
                    if is_retryable(error) and job.attempts < max_attempts:
                        await sleep(backoff * 2 ** (job.attempts - 1))
                        queue.put_nowait(job)
                    else:
                        report.dead_letters.append(DeadLetter(job, f"{type(error).__name__}: {error}"))
            finally:
                queue.task_done()

    tasks = [asyncio.create_task(worker()) for _ in range(workers)]
    try:
        await queue.join()
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    return report
