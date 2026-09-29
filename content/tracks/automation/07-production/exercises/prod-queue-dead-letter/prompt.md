The invoice extractor's nightly batch has 10,000 documents to get through. Write the worker pool
that runs it: `await run_jobs(jobs, handle, *, workers=3, max_attempts=3, timeout=30.0, backoff=1.0,
sleep=asyncio.sleep)`, which returns a `RunReport` (in the starter).

- `jobs` is a list of `Job`s (in the starter). `handle` is an async function that processes one
  job's `payload` and returns a result.
- Put the jobs on an `asyncio.Queue` and run `workers` workers, so at most that many jobs are being
  handled at once. Return when every job is finished, with no worker left running.
- Each attempt adds 1 to the job's `attempts`, and runs `handle` under a `timeout` in seconds.
- A success stores the result in `report.results[job.id]`.
- A retryable failure (`is_retryable`, in the starter; a timeout counts) goes back on the queue,
  after `await sleep(backoff * 2 ** (attempts - 1))`: 1 s after the first attempt, then 2 s.
- A job that fails with an error that isn't retryable, or has used `max_attempts`, goes to
  `report.dead_letters` as `DeadLetter(job, "<ExceptionType>: <message>")`. No job is ever lost, and
  one bad job never stops the others.

```python
async def handle(payload):
    if payload["document_id"] == "doc_3":
        raise ValueError("not an invoice")
    return f"booked {payload['document_id']}"

jobs = [Job(f"job-{n}", {"document_id": f"doc_{n}"}) for n in range(1, 5)]
report = await run_jobs(jobs, handle, workers=2)
report.results        # {"job-1": "booked doc_1", "job-2": "booked doc_2", "job-4": "booked doc_4"}
report.dead_letters   # [DeadLetter(job=Job("job-3", ..., attempts=1), error="ValueError: not an invoice")]
```
