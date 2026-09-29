import asyncio

from plp import hidden, test
from plp_fakes import FakeLLMError
from solution import DeadLetter, Job, run_jobs


def jobs(count):
    return [Job(f"job-{n}", {"document_id": f"doc_{n}"}) for n in range(1, count + 1)]


class Sleeps:
    """A sleep that records its delays and doesn't wait."""

    def __init__(self):
        self.delays = []

    async def __call__(self, seconds):
        self.delays.append(seconds)


async def book(payload):
    if payload["document_id"] == "doc_3":
        raise ValueError("not an invoice")
    return f"booked {payload['document_id']}"


@test("Runs the example: three booked, one dead-lettered")
async def _():
    report = await run_jobs(jobs(4), book, workers=2, sleep=Sleeps())
    assert report.results == {"job-1": "booked doc_1", "job-2": "booked doc_2", "job-4": "booked doc_4"}
    assert [(d.job.id, d.job.attempts, d.error) for d in report.dead_letters] == [("job-3", 1, "ValueError: not an invoice")]


@test("Retries a rate limit with backoff, and it succeeds")
async def _():
    failures = {"doc_2": 2}

    async def handle(payload):
        if failures.get(payload["document_id"]):
            failures[payload["document_id"]] -= 1
            raise FakeLLMError(429, "rate limited")
        return "ok"

    sleeps = Sleeps()
    all_jobs = jobs(3)
    report = await run_jobs(all_jobs, handle, sleep=sleeps)
    assert report.results == {"job-1": "ok", "job-2": "ok", "job-3": "ok"}
    assert report.dead_letters == []
    assert all_jobs[1].attempts == 3
    assert sleeps.delays == [1.0, 2.0]


@test("Gives up after max_attempts and keeps the last error")
async def _():
    async def handle(payload):
        raise FakeLLMError(529, "overloaded")

    sleeps = Sleeps()
    report = await run_jobs(jobs(1), handle, max_attempts=3, backoff=0.5, sleep=sleeps)
    assert report.results == {}
    [dead] = report.dead_letters
    assert (dead.job.attempts, dead.error) == (3, "FakeLLMError: Fake LLM error 529: overloaded")
    assert sleeps.delays == [0.5, 1.0]


@test("A job that hangs times out, is retried, then dead-lettered", timeout=5)
async def _():
    async def handle(payload):
        if payload["document_id"] == "doc_1":
            await asyncio.sleep(10)
        return "ok"

    report = await run_jobs(jobs(2), handle, timeout=0.01, max_attempts=2, sleep=Sleeps())
    assert report.results == {"job-2": "ok"}
    assert [(d.job.id, d.job.attempts, d.error.split(":")[0]) for d in report.dead_letters] == [("job-1", 2, "TimeoutError")]


@hidden("Never runs more jobs at once than there are workers")
async def _():
    running = {"now": 0, "max": 0}

    async def handle(payload):
        running["now"] += 1
        running["max"] = max(running["max"], running["now"])
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        running["now"] -= 1
        return payload["document_id"]

    report = await run_jobs(jobs(20), handle, workers=4, sleep=Sleeps())
    assert len(report.results) == 20
    assert running["max"] == 4


@hidden("Leaves no worker tasks running, and handles an empty batch")
async def _():
    before = len(asyncio.all_tasks())
    await run_jobs(jobs(5), book, workers=3, sleep=Sleeps())
    await asyncio.sleep(0)
    assert len(asyncio.all_tasks()) == before
    empty = await run_jobs([], book, sleep=Sleeps())
    assert (empty.results, empty.dead_letters) == ({}, [])
