---
slug: prod-tracing
title: Tracing and what to log
summary: Record every model and tool call as a span with model, tokens, latency, cost and prompt version, and keep personal data and secrets out of it.
minutes: 50
exercises:
  - prod-predict-span-tree
  - prod-tracer
  - prod-traced-llm
  - prod-fix-pii-in-trace
  - prod-redact-pii
---

The invoice extractor has been live for a month, processing about 10,000 documents a day. This
morning the client's finance lead writes: "INV-4410 was booked yesterday with a total of 124.05
instead of 1,240.50. Why?" If all you have is a log line saying `processed 9,847 invoices`, the
honest answer is "no idea". With a trace, you can open that one document's run and see the prompt
version it used, the model that answered, the two attempts the repair loop needed, the validation
error on the first one, and the 3.2 seconds it took.

This lesson builds a tiny tracer, uses it to record every model and tool call, and draws a firm
line around what you may record: personal data and secrets stay out.

## Traces and spans

A **trace** is the story of one unit of work: one support question, one invoice, one email. It's
made of **spans**, one per step, each with a name, a start and end time, a status, and a few
**attributes** (key–value facts about that step). Spans nest: the `extract_invoice` span contains
two `llm.complete` spans and a `tool.lookup_vendor` span, so you can see where the time went.

```text
extract_invoice            3,212 ms  ok     document_id=doc_88213 prompt_version=invoice-v7
  llm.complete             1,406 ms  ok     model=model-small input_tokens=1,850 output_tokens=96
  llm.complete             1,391 ms  ok     model=model-small input_tokens=2,010 output_tokens=94
  tool.lookup_vendor         402 ms  ok     vendor=Kiln Supplies
```

A span is a context manager: enter it when the step starts, and on the way out record the end time
and whether it raised. The clock is a parameter, so tests can control time.

```python
from contextlib import contextmanager

spans = []


@contextmanager
def span(name, clock):
    record = {"name": name, "start": clock(), "status": "ok"}
    try:
        yield record
    except Exception as exc:
        record["status"] = f"error: {type(exc).__name__}"
        raise
    finally:
        record["ms"] = (clock() - record["start"]) * 1000
        spans.append(record)


clock = iter([0.0, 1.4, 2.0, 2.4]).__next__   # a fake clock: each call returns the next time
with span("llm.complete", clock):
    pass
try:
    with span("tool.lookup_vendor", clock):
        raise TimeoutError("vendor API didn't answer")
except TimeoutError:
    pass
[(s["name"], round(s["ms"]), s["status"]) for s in spans]
```

The `finally` records the span whether the step succeeded or not, and the bare `raise` sends the
exception on, so tracing never changes what the code does. A tracer that swallows errors is worse
than none.

## A tiny tracer

To nest spans, the tracer keeps a stack of the spans that are open: a new span's parent is
whatever is on top. That's all a tracing library does at its core, plus sending spans somewhere.

```python
from contextlib import contextmanager
from dataclasses import dataclass, field


@dataclass
class Span:
    name: str
    span_id: str
    parent_id: str | None
    attributes: dict = field(default_factory=dict)


class Tracer:
    def __init__(self):
        self.spans, self._open = [], []

    @contextmanager
    def span(self, name, **attributes):
        parent = self._open[-1].span_id if self._open else None
        current = Span(name, f"s{len(self.spans) + 1}", parent, dict(attributes))
        self.spans.append(current)
        self._open.append(current)
        try:
            yield current
        finally:
            self._open.pop()


tracer = Tracer()
with tracer.span("extract_invoice", document_id="doc_88213"):
    with tracer.span("llm.complete"):
        pass
    with tracer.span("tool.lookup_vendor"):
        pass
[(s.name, s.span_id, s.parent_id) for s in tracer.spans]
```

> [!NOTE]
> A plain list works for code that runs one thing at a time. With asyncio, several pipelines share
> one tracer at once, and each task needs its own stack. Real tracers keep the current span in a
> `contextvars.ContextVar`, which asyncio copies into every task (module 12).

## Trace every model and tool call

You don't want to edit every call site. The same trick as A2's usage tracker works here: wrap the
`llm` in an object with the same `complete()` that opens a span around each call. For tools, a
decorator does the job:

```python
import functools
import time

calls = []


def traced(name):
    def decorate(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            status = "ok"
            try:
                return fn(*args, **kwargs)
            except Exception as exc:
                status = f"error: {type(exc).__name__}"
                raise
            finally:
                elapsed_ms = (time.perf_counter() - start) * 1000
                calls.append((name, status, elapsed_ms < 1_000))
        return wrapper
    return decorate


@traced("tool.lookup_vendor")
def lookup_vendor(name):
    return {"vendor_id": "V-118", "name": name, "payment_terms_days": 30}


lookup_vendor("Kiln Supplies")
lookup_vendor.__name__, calls
```

`functools.wraps` keeps the tool's name and docstring, which matters in A3's tool loop, where the
schema is generated from the function.

## What to log

Every LLM span should answer the questions you'll be asked about it later:

| Attribute | Why |
|-----------|-----|
| `model` (from the response) | Aliases resolve to versions; the response names what you were billed for |
| `prompt_version` | "Did the change on the 12th cause this?" needs a version on every call |
| `input_tokens`, `output_tokens`, `cost_usd` | Cost per document, per client, per feature |
| `latency_ms` | Slow steps, and timeouts that are about to happen |
| `stop_reason` | `max_tokens` means a truncated answer |
| `tool_calls` (names only) | What the model decided to do |
| `attempt`, `cache_hit` | Retries and caching explain odd costs and latencies |
| `error_type` | Rate limits vs timeouts vs bad requests |
| a pseudonymous user or tenant id | Per-user budgets and support, without the person's identity |

The pipeline's top span adds the business id (`document_id`, `ticket_id`) so you can find the trace
from the client's complaint.

## What not to log

The wrong way first, and it's in almost every first version:

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", force=True)
log = logging.getLogger("support-bot")

headers = {"x-api-key": "sk-ant-live-8f2Kq0tRz9", "anthropic-version": "2023-06-01"}
email = "Hi, it's Ada Byrne (ada.byrne@example.com, +44 7700 900123). Where's order 1042?"
log.info("Calling model with %s: %s", headers, email)
```

That one line has put an API key, a name, an email address and a phone number into your log
provider, your backups, and every laptop that ever downloads the logs. Logs are copied far more
widely than databases, kept longer, and protected less. Under GDPR and similar laws they're personal
data like any other, with the same rules on retention and access.

The rules:

- **Never log secrets**: API keys, auth headers, tokens, passwords. Log the key's last four
  characters if you must tell keys apart.
- **Don't log message content by default.** Log metadata (lengths, ids, counts). When you need
  content to debug, store it separately, **redacted**, access-controlled, and deleted after a set
  number of days.
- **Redact before anything leaves the function**: emails, phone numbers, card numbers, addresses.
- **Refer to people by a pseudonymous id**, a keyed hash of their email, so you can group one
  customer's traces without storing who they are.

```python
import hashlib
import hmac
import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"\+?\d[\d\s()-]{7,}\d")
LOG_KEY = b"read-me-from-the-environment"   # a secret, so the hash can't be reversed by guessing


def redact(text):
    return PHONE.sub("[PHONE]", EMAIL.sub("[EMAIL]", text))


def user_ref(email):
    return "u_" + hmac.new(LOG_KEY, email.lower().encode(), hashlib.sha256).hexdigest()[:12]


email = "Hi, it's Ada Byrne (ada.byrne@example.com, +44 7700 900123). Where's order 1042?"
redact(email), user_ref("ada.byrne@example.com") == user_ref("Ada.Byrne@example.com")
```

The order number survives, because you need it, and the contact details don't. Names are harder:
no regex finds them reliably, which is one more reason not to log content by default. The last drill
builds a stricter `redact` that also catches card numbers and API keys.

```quiz
question: Which of these is safe to put in a trace attribute for the support bot?
options:
  - The customer's email address, so support can find their traces
  - The first 200 characters of the customer's message, for debugging
  - An HMAC of the email with a secret key, plus the ticket id
  - The request headers, so you can see which API version was used
answer: 2
explain: "A keyed hash groups one customer's traces without storing who they are, and the ticket id links to the system that's allowed to hold their details. The message preview and the email are personal data, and the headers contain the API key."
```

## Langfuse and OpenTelemetry

You won't ship your tiny tracer to a client. Two tools cover most real deployments, and both map
directly onto what you've built: spans, nesting, attributes.

**Langfuse** is an open-source tracing and eval platform built for LLM apps, hosted or self-hosted.
Its decorator turns a function into a span, and it groups LLM calls as "generations" with model,
usage and cost:

```python norun
# uv add langfuse   (reads LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY and LANGFUSE_HOST from the environment)
from langfuse import get_client, observe

langfuse = get_client()


@observe(as_type="generation", name="llm.complete")
def complete(messages, **options):
    response = llm.complete(messages, **options)
    langfuse.update_current_generation(
        model=response.model,
        usage_details={"input": response.usage.input_tokens, "output": response.usage.output_tokens},
        metadata={"prompt_version": PROMPT_VERSION},
    )
    return response


@observe(name="extract_invoice")
def extract_invoice(document_id, text):
    ...
```

**OpenTelemetry** is the vendor-neutral standard: instrument once, and send spans to Grafana,
Honeycomb, Datadog, Jaeger or Langfuse itself. It has semantic conventions for generative AI, so
attributes like `gen_ai.request.model` and `gen_ai.usage.input_tokens` mean the same thing
everywhere.

```python norun
# uv add opentelemetry-sdk opentelemetry-exporter-otlp
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))   # endpoint from OTEL_EXPORTER_OTLP_ENDPOINT
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("invoice-extractor")

with tracer.start_as_current_span("llm.complete") as span:
    response = llm.complete(messages, model="model-small")
    span.set_attribute("gen_ai.request.model", "model-small")
    span.set_attribute("gen_ai.response.model", response.model)
    span.set_attribute("gen_ai.usage.input_tokens", response.usage.input_tokens)
    span.set_attribute("gen_ai.usage.output_tokens", response.usage.output_tokens)
```

Whichever you use, the rules from the last section still apply: redact before the span is
exported, not in the dashboard afterwards. Both tools can capture prompts and outputs
automatically; switch that off, or put your redaction in front of it, before real customer data
flows through.

## Where this leaves you

A trace is one unit of work, made of nested spans with timings, a status and attributes. A small
tracer is a stack of open spans and a context manager that always records and never swallows
errors. Wrap the `llm` and decorate tools so every call gets a span with model, prompt version,
tokens, cost, latency, stop reason and tool names. Keep secrets and message content out, redact
personal data before it's recorded, and use a keyed hash for user ids. Langfuse and OpenTelemetry
do the same at scale. The drills predict a span tree, build the tracer, wrap an `llm` in spans,
fix a pipeline that logs customer details, and write a stricter redactor.
