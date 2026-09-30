---
slug: prod-cost-control
title: Caching, routing and budgets
summary: Cut the bill with response caching, provider prompt caching and cheap-first model routing, cap it with per-user and per-day budgets, and report it from usage logs.
minutes: 50
exercises:
  - prod-fix-cache-key
  - prod-cached-llm
  - prod-model-router
  - prod-user-budgets
  - prod-cost-report
---

The support bot costs the client about $40 a day, which was the estimate. Then one Monday it costs
$610. A customer's script had been sending the same question every two seconds all weekend, each
one a fresh model call with the whole help centre in the prompt. Nothing was broken; nothing was
stopping it either.

A2 gave you cost per call and a budget for one job. This lesson is cost control for a service: don't
pay twice for the same answer, let the provider cache the part of the prompt that never changes,
send easy work to cheap models, cap what any one user or day can spend, and report where the money
goes so the next surprise is visible on Tuesday, not at the end of the month.

> [!WARNING]
> Every price in this lesson and its drills is an **example**, made up for practice. Real prices,
> cache discounts and minimum cacheable lengths differ by provider and model, and change. Read them
> from each provider's pricing page into your own table.

## Response caching

If the same request comes in twice, the second answer can come from a cache instead of the model:
free, and in a millisecond. The key is a hash of **everything that affects the answer**: the model,
the system prompt, the messages, the tools, the temperature and the output limit. Leave one out and
two different requests share an answer.

```python
import hashlib
import json


def cache_key(*, model, system, messages, tools, temperature, max_tokens):
    request = {"model": model, "system": system, "messages": messages, "tools": tools,
               "temperature": temperature, "max_tokens": max_tokens}
    canonical = json.dumps(request, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


question = [{"role": "user", "content": "How long do refunds take?"}]
small = cache_key(model="model-small", system="You are Kiln & Co's support bot.", messages=question, tools=None, temperature=0, max_tokens=300)
large = cache_key(model="model-large", system="You are Kiln & Co's support bot.", messages=question, tools=None, temperature=0, max_tokens=300)
small[:16], small == large
```

`sort_keys` makes the key independent of dict order, the same trick as A3's idempotency keys.

When is a cached answer right?

- **Deterministic calls only.** At `temperature=0` you want the same answer each time anyway. At a
  high temperature the variety is the point, so don't cache.
- **Not when the answer depends on live data.** "Where is order 1042?" changes as the parcel moves.
  Cache the answer to "how long do refunds take?", or put a short expiry (a **TTL**) on everything.
- **Invalidate on change.** Put the prompt version in the key, or in the system prompt, so a new
  prompt never serves an old prompt's answers.

Exact-match caching catches retries, duplicate webhooks, and scripts like the one above. Different
wordings of the same question miss it. "Semantic" caches match on embeddings (A4) instead, and can
return a wrong answer to a question that only looks similar; use one only with a high similarity
threshold and an eval that proves it.

## Provider prompt caching

The support bot's system prompt carries 6,000 tokens of help-centre policy, and every question
sends it again. Both providers can cache a **prefix** of the prompt on their side: the next request
that starts with exactly the same tokens reuses the work, and those tokens are billed at a steep
discount and processed faster. Unlike your response cache, the model still runs; only the repeated
prefix gets cheaper.

With Anthropic you mark where the cacheable prefix ends with `cache_control`. The cache lasts a few
minutes by default, extended each time it's used. Writing to it costs a little more than normal
input; reading costs a fraction:

```python norun
response = http.post("/v1/messages", headers=headers, json={
    "model": "claude-haiku-4-5",
    "max_tokens": 400,
    "system": [
        {"type": "text", "text": HELP_CENTRE_POLICY,               # ~6,000 tokens, identical every call
         "cache_control": {"type": "ephemeral"}},                 # cache everything up to here
    ],
    "messages": [{"role": "user", "content": question}],          # changes every call; not cached
})
usage = response.json()["usage"]
usage["cache_creation_input_tokens"], usage["cache_read_input_tokens"], usage["input_tokens"]
```

OpenAI caches long prompt prefixes automatically, with no marker, and reports the cached part in
`usage.prompt_tokens_details.cached_tokens`. Both need a minimum prefix length (around a thousand
tokens) before anything is cached. Either way, the rule for your prompts is the same: **put what never
changes first** (instructions, policy, tool definitions, examples) and what changes last (the
question, the retrieved chunks). A timestamp at the top of the system prompt defeats the cache on
every call.

```python
from decimal import Decimal

INPUT = Decimal("1.00")                 # EXAMPLE: $ per million input tokens
CACHE_WRITE, CACHE_READ = INPUT * Decimal("1.25"), INPUT * Decimal("0.10")   # EXAMPLE multipliers
prefix, question, calls = 6_000, 60, 3_000                                    # tokens, tokens, calls a day

without = (prefix + question) * calls * INPUT / 1_000_000
with_cache = (prefix * CACHE_WRITE + (prefix * CACHE_READ + question * INPUT) * (calls - 1) + question * INPUT) / 1_000_000
round(without, 2), round(with_cache, 2)
```

That's the best case, with the cache warm all day. A quiet hour lets it expire, and the next call
writes it again. Measure with the usage fields rather than trusting the arithmetic.

## Model routing

Most support questions are easy. Send every question to a small, cheap model first, and escalate to
a larger one only when the small model isn't confident, or its answer doesn't pass a check. That's
**cheap-first routing**, one of A5's workflow patterns with a cost motive.

```python
import json

from plp_fakes import ScriptedLLM

ROUTER_SYSTEM = 'Answer from the policy. Reply with JSON: {"answer": "...", "confidence": 0.0-1.0}'
llm = ScriptedLLM([
    '{"answer": "Refunds take 14 days.", "confidence": 0.93}',                  # small, easy question
    '{"answer": "Possibly, depending on the region?", "confidence": 0.41}',     # small, unsure
    '{"answer": "Yes: Ireland, 3-5 working days, from 6.50 EUR.", "confidence": 0.9}',   # large
])


def route(question, threshold=0.7):
    for model in ("model-small", "model-large"):
        reply = json.loads(llm.complete([{"role": "user", "content": question}], system=ROUTER_SYSTEM, model=model, temperature=0).text)
        if reply["confidence"] >= threshold:
            return model, reply["answer"]
    return model, reply["answer"]


route("How long do refunds take?"), route("Do you ship to Ireland?")
```

Self-reported confidence is a rough signal, and models are often overconfident. Calibrate the
threshold with your eval (lesson 2): run both models on the golden set, and pick the threshold where
the routed pass rate matches the large model's at the lowest cost. Other routing signals are often
better: a classifier's label, the length of the input, whether retrieval found anything, or whether
the output passes a validator.

## Budgets per user and per day

A2's budget capped one job. A service needs caps that hold across requests:

- **Per user per day**: no customer (or script) can spend more than, say, $0.50 a day.
- **Per day overall**: the whole service stops at, say, $100 a day, and alerts someone.
- **Per job**: an agent run or one document never exceeds its cap (A2, A5).

Check before the call with a worst-case estimate, charge the actual cost after it, and reset at a
fixed time in one time zone (UTC midnight, usually). When a limit is hit, degrade rather than fail:
a cached answer, a smaller model, or "we'll get back to you" and a ticket for a person.

```python
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal

spent = defaultdict(Decimal)                       # (user, day) -> dollars
USER_DAILY = Decimal("0.50")


def allow(user, estimate, now):
    return spent[(user, now.date())] + estimate <= USER_DAILY


now = datetime(2026, 10, 5, 23, 59, tzinfo=timezone.utc)
spent[("u_3f9a", now.date())] = Decimal("0.49")
allow("u_3f9a", Decimal("0.02"), now), allow("u_3f9a", Decimal("0.02"), datetime(2026, 10, 6, 0, 1, tzinfo=timezone.utc))
```

In production the counters live in Redis or the database, shared by every worker, and are updated
atomically. A dict in one process can't cap a service that runs on four.

## Cost reports from usage logs

Every traced call from lesson 3 already records model, tokens and a user reference. Price it, group
it, and the report writes itself. pandas (module 16) is the right tool:

```python
import pandas as pd

usage = pd.DataFrame([
    {"day": "2026-10-05", "feature": "support_bot", "model": "model-small", "input_tokens": 1_800_000, "output_tokens": 90_000},
    {"day": "2026-10-05", "feature": "invoice_extractor", "model": "model-small", "input_tokens": 9_500_000, "output_tokens": 600_000},
    {"day": "2026-10-05", "feature": "support_bot", "model": "model-large", "input_tokens": 200_000, "output_tokens": 30_000},
])
prices = pd.DataFrame([  # EXAMPLE prices, $ per million tokens
    {"model": "model-small", "input_price": 0.50, "output_price": 2.00},
    {"model": "model-large", "input_price": 12.00, "output_price": 48.00},
])
priced = usage.merge(prices, on="model", how="left")
priced["cost"] = (priced.input_tokens * priced.input_price + priced.output_tokens * priced.output_price) / 1_000_000
priced.groupby("feature")["cost"].sum().round(2)
```

The large model handles a fraction of the support bot's traffic and costs more than all of its small
model calls: exactly the kind of thing a weekly report should put in front of you. The `how="left"`
merge keeps rows for a model with no price, so it shows up as a gap rather than silently vanishing.

```quiz
question: The response cache's hit rate drops from 30% to 0% overnight, and nothing in the cache code changed. What's the most likely cause?
options:
  - The provider changed its prices
  - A deploy added the current time or a request id to the system prompt
  - The cache's TTL is too long
  - More users started asking questions
answer: 1
explain: "The key hashes everything that affects the answer, including the system prompt. Anything that makes every prompt unique, like a timestamp or request id, makes every key unique too. It also defeats provider prompt caching, for the same reason."
```

## Where this leaves you

Cache responses under a key that hashes every parameter that changes the answer, only for
deterministic calls, with a TTL and the prompt version in the key. Let the provider cache a stable
prefix by putting unchanging instructions first. Route to a cheap model first and escalate on low
confidence or a failed check, with a threshold chosen by eval. Cap spend per user, per day and per
job, check the worst case before a call and charge the actual cost after, and degrade gracefully at
the limit. Report cost by feature, model and day from the usage your traces already record. The
drills fix a cache key that ignores the model and temperature, build a caching wrapper and a router,
write a budget ledger, and turn usage logs into a cost report.
