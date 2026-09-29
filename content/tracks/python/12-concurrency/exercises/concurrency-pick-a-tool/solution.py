from dataclasses import dataclass


@dataclass(frozen=True)
class Job:
    tasks: int
    bound: str  # "io" or "cpu"
    async_client: bool
    free_threaded: bool


def pick_tool(job):
    """"sequential", "asyncio", "threads" or "processes" for this job."""
    if job.tasks <= 1:
        return "sequential"
    if job.bound == "io":
        return "asyncio" if job.async_client else "threads"
    return "threads" if job.free_threaded else "processes"
