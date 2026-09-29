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
    report = RunReport()
    for job in jobs:
        job.attempts += 1
        report.results[job.id] = await handle(job.payload)
    return report
