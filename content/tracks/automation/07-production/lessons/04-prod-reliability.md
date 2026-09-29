---
slug: prod-reliability
title: Timeouts, fallbacks, breakers and queues
summary: Keep an AI pipeline working through provider outages with deadlines, retries, a fallback chain, a circuit breaker, idempotent side effects, and a worker queue with dead letters.
minutes: 55
exercises:
  - prod-predict-fallback
  - prod-fallback-chain
  - prod-fix-breaker-half-open
  - prod-fix-duplicate-booking
  - prod-queue-dead-letter
---

At 14:05 on a Tuesday, your model provider starts returning 529 "overloaded" to one request in
three, and answering the rest in 40 seconds instead of two. The support bot's chat widget spins.
The invoice extractor's nightly batch, still catching up from the weekend, retries every failure
four times and doubles the load. By 14:30 three invoices have been booked twice, because the
retries re-ran a pipeline that had already posted them to the accounting system.

None of that is the provider's fault. A2 gave you retries for one HTTP call; this lesson is about
the whole pipeline: deadlines, retries at the right level, a chain of fallbacks, a circuit breaker
that stops hammering a provider that's down, idempotency so repeats are harmless, and a queue that
does the slow work away from the user and keeps what it can't finish.

## A deadline for the whole pipeline

A per-request timeout of 60 seconds sounds safe, but a pipeline with three model calls, each
allowed four attempts with backoff, can take ten minutes before it gives up. A user in a chat
widget gives up after ten seconds. Set a **deadline** for the whole unit of work, and decide what
happens when it passes. With asyncio that's `asyncio.timeout` (module 12):

```python
import asyncio


async def answer(question):
    await asyncio.sleep(0.2)                 # the provider is slow today
    return "Refunds reach your card within 14 days."


async def answer_within_deadline(question, seconds):
    try:
        async with asyncio.timeout(seconds):
            return await answer(question)
    except TimeoutError:
        return "Sorry, I'm slow to answer right now. A person will reply to you by email."


asyncio.run(answer_within_deadline("How long do refunds take?", seconds=0.05))
```

The deadline cancels whatever was in progress, including retries and backoff sleeps. Pick it from
the user's side: a chat reply needs one in seconds, a nightly batch job in minutes.

## Retry at the right level

Retry the smallest step that failed, not the whole pipeline. Retrying `extract_invoice()` after its
third model call timed out repeats the first two calls, which you pay for again, and repeats any
side effect in between. Your A2 adapter already retries each HTTP call; above it, code should
decide what an error means. One helper sorts errors from either the fakes or your A2 client:

```python
from plp_fakes import Fail, FakeLLMError, ScriptedLLM, Timeout


def is_retryable(error):
    """Worth trying again later: timeouts, rate limits and provider errors, not our mistakes."""
    if isinstance(error, TimeoutError):
        return True
    if getattr(error, "retryable", None) is not None:   # the LLMError hierarchy from A2
        return error.retryable
    status = getattr(error, "status", None)
    return status == 429 or (status is not None and status >= 500)


errors = []
for reply in [Fail(529), Fail(429, retry_after=2), Fail(400, "max_tokens too large"), Timeout()]:
    try:
        ScriptedLLM([reply]).complete([{"role": "user", "content": "Where is order 1042?"}])
    except (FakeLLMError, TimeoutError) as error:
        errors.append((type(error).__name__, getattr(error, "status", None), is_retryable(error)))
errors
```

## Fallbacks

When retrying the primary model won't help in time, fall back. A **fallback chain** tries each
option in order, moving on only for errors that another option could avoid:

1. The primary model.
2. A second model, ideally at another provider, so one outage doesn't take out both.
3. A **cached answer**: the last good answer to the same question, marked as possibly stale.
4. A graceful message: "a person will reply", with the request queued for later.

```python
from plp_fakes import Fail, ScriptedLLM


def ask(chain, messages):
    for name, llm in chain:
        try:
            return name, llm.complete(messages).text
        except Exception as error:
            if not is_retryable(error):
                raise                              # a bad request is bad for every model
    return "none", None


def is_retryable(error):
    status = getattr(error, "status", None)
    return isinstance(error, TimeoutError) or status == 429 or (status is not None and status >= 500)


chain = [("primary", ScriptedLLM([Fail(529)])), ("secondary", ScriptedLLM(["Refunds take 14 days."]))]
ask(chain, [{"role": "user", "content": "How long do refunds take?"}])
```

> [!WARNING]
> A fallback model is part of the product. Run the eval from lesson 1 on it, with the same prompt,
> before it's in the chain. A fallback that answers badly during an outage does more damage than a
> polite "we'll get back to you".

## Circuit breakers

During an outage, every request still waits for its timeout and its retries before falling back.
Thousands of requests doing that at once pile up workers, connections and cost, and keep hitting a
provider that's trying to recover. A **circuit breaker** notices and stops calling for a while:

- **Closed** (normal): calls go through. Count consecutive failures.
- **Open**: after N failures in a row, fail every call immediately, without calling, for a
  cool-down period. Callers go straight to their fallback.
- **Half-open**: once the cool-down has passed, let **one** trial call through. Success closes the
  breaker; failure opens it again for another cool-down.

The clock is a parameter, as always, so tests can move time forward.

```python
class CircuitOpen(Exception):
    pass


class Breaker:
    def __init__(self, *, threshold, cooldown, clock):
        self.threshold, self.cooldown, self.clock = threshold, cooldown, clock
        self.failures, self.opened_at = 0, None

    @property
    def state(self):
        if self.opened_at is None:
            return "closed"
        return "half_open" if self.clock() - self.opened_at >= self.cooldown else "open"

    def call(self, fn):
        if self.state == "open":
            raise CircuitOpen("provider marked down; not calling")
        try:
            result = fn()
        except Exception:
            self.failures += 1
            if self.state == "half_open" or self.failures >= self.threshold:
                self.opened_at = self.clock()
            raise
        self.failures, self.opened_at = 0, None
        return result


now = [0.0]
breaker = Breaker(threshold=2, cooldown=30, clock=lambda: now[0])


def overloaded():
    raise RuntimeError("529 overloaded")


states = []
for t in [0, 1, 2, 31]:
    now[0] = t
    try:
        breaker.call(overloaded)
    except Exception as error:
        states.append((t, type(error).__name__, breaker.state))
states
```

The first two calls failed and opened the breaker; the call at 2 s was refused without touching the
provider; at 31 s the trial call went through, failed, and opened it again. Keep one breaker per
provider (or per model), shared by every request in the process.

## Idempotency for side effects

The invoices booked twice at 14:30 came from this shape of code:

```python norun
def process_invoice(document):
    invoice = extract_invoice(llm, document.text)       # a model call
    accounting.post("/bills", json=invoice)             # a side effect
    summary = llm.complete(...)                         # times out at 14:05
    ...

retry(process_invoice, document)                        # posts the bill again
```

A side effect is anything that changes the world outside your process: a bill posted, an email
sent, a ticket created, a refund requested. When a retry can reach it twice, give it an
**idempotency key**: a value derived from the business operation, identical on every attempt, which
the receiving side uses to recognise a repeat. Many APIs (payment providers especially) accept an
`Idempotency-Key` header and return the original result for a key they've seen. When the API
doesn't, keep your own record of completed steps, keyed the same way, and check it first.

```python
import httpx
from plp_fakes import fake_api

bills = {}


def create_bill(request):
    key = request["headers"].get("idempotency-key")
    if key not in bills:
        bills[key] = {"bill_id": f"B-{len(bills) + 1:04d}", **request.json}
    return 201, bills[key]


api = fake_api({"POST /bills": create_bill})
http = httpx.Client(transport=api.transport, base_url="https://accounting.example")
for attempt in range(3):                                # the pipeline was retried twice
    http.post("/bills", json={"invoice": "INV-2291", "total": "1240.50"},
              headers={"Idempotency-Key": "bill:doc_88213"})
len(api.requests), list(bills.values())
```

The key is `bill:doc_88213`, built from the document id and the step. A random UUID per attempt
would defeat the point: every retry would look new.

## Queues, workers and dead letters

The invoice extractor shouldn't process documents inside the web request that uploaded them. Put
each job on a **queue** and return at once; **workers** take jobs off the queue and process them at
the pace the provider allows. A job that fails with a retryable error goes back on the queue with
its attempt count; one that has used all its attempts, or failed with an error no retry can fix,
goes to a **dead-letter** list with its error, for a person to look at. Nothing is lost silently.

```python
import asyncio


async def process(job):
    if job["document_id"] == "doc_3":
        raise ValueError("not an invoice")
    return f"booked {job['document_id']}"


async def worker(queue, done, dead):
    while True:
        job = await queue.get()
        try:
            done.append(await process(job))
        except Exception as error:
            dead.append((job["document_id"], f"{type(error).__name__}: {error}"))
        finally:
            queue.task_done()


async def main():
    queue, done, dead = asyncio.Queue(), [], []
    for n in range(1, 5):
        queue.put_nowait({"document_id": f"doc_{n}", "attempt": 1})
    workers = [asyncio.create_task(worker(queue, done, dead)) for _ in range(2)]
    await queue.join()
    for task in workers:
        task.cancel()
    return sorted(done), dead


asyncio.run(main())
```

On a server, the queue must survive a restart, so it lives outside the process: Redis with RQ or
Celery, a database table, or a cloud queue. The ideas are identical: jobs, workers, retries with
backoff, and a failed-jobs list that is your dead-letter queue.

```python norun
# uv add rq redis        then run workers with:  rq worker invoices
import os

from redis import Redis
from rq import Queue, Retry

queue = Queue("invoices", connection=Redis.from_url(os.environ["REDIS_URL"]))
queue.enqueue(
    process_invoice, "doc_88213",
    job_id="invoice:doc_88213",                    # enqueuing the same document twice is one job
    retry=Retry(max=3, interval=[10, 60, 300]),    # backoff between attempts
)
# Jobs that use up their retries land in queue.failed_job_registry, the dead-letter list.

# The same with Celery:
# @app.task(autoretry_for=(TimeoutError,), retry_backoff=True, max_retries=3, acks_late=True)
# def process_invoice(document_id): ...
```

```quiz
question: A worker takes a job, calls the model, posts the bill, and then crashes before marking the job done. The queue gives the job to another worker. What stops a second bill?
options:
  - Nothing; this can't happen with a good queue
  - An idempotency key built from the document id, sent with the post
  - A longer visibility timeout on the queue
  - Retrying with exponential backoff
answer: 1
explain: "Every real queue delivers a job at least once, so after a crash a job can run again. Only idempotency makes the repeat harmless. A longer timeout makes it rarer, not impossible."
```

## Where this leaves you

Give the whole unit of work a deadline from the user's point of view. Retry the smallest step that
failed, and only for errors that can succeed later. Fall back through a second model, a cached
answer and a graceful message, having evaluated every fallback. Put a circuit breaker per provider
that opens after repeated failures, refuses calls during a cool-down, and lets one trial through
when it half-opens. Make every side effect idempotent with a key built from the business operation.
Queue slow work, retry it with backoff, and dead-letter what can't be done. The drills predict a
fallback chain, build one with a cached answer, fix a breaker that never half-opens and a retry
that books twice, and write a queue worker with a dead-letter list.
