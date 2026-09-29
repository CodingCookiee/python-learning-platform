from dataclasses import dataclass


@dataclass(frozen=True)
class Job:
    tasks: int
    bound: str  # "io" or "cpu"
    async_client: bool
    free_threaded: bool


def pick_tool(job):
    """"sequential", "asyncio", "threads" or "processes" for this job."""
    ...
