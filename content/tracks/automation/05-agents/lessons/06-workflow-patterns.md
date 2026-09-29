---
slug: workflow-patterns
title: Five workflow patterns
summary: Prompt chaining, routing, parallel calls with asyncio, orchestrator and workers, and evaluator and optimiser. Each is a small function, and together they solve most jobs without an agent.
minutes: 55
exercises:
  - agent-prompt-chain
  - agent-predict-gather-order
  - agent-route-ticket
  - agent-parallel-briefs
  - agent-evaluator-optimiser
  - agent-orchestrator-workers
---

Lesson 1 argued that most paid jobs want a workflow, not an agent. This lesson gives you the
workflows. Five patterns come up again and again in production LLM systems, and each is a
short function around your `llm`: chain the calls, route to the right one, run independent ones at
once, let a model split the work, or loop a writer against a judge. They're predictable because
your code still decides the shape, and they compose: a router can send one kind of ticket to a
chain and another to an agent.

## Prompt chaining

Break a job into steps where each call's output is the next call's input. A sales call transcript
becomes facts, then a CRM note, then a follow-up email. Each prompt does one thing well, and
between steps you can put a **gate**: a check in code that stops the chain before bad output
propagates.

```python
from plp_fakes import ScriptedLLM

llm = ScriptedLLM([
    "- Budget approved for 20 seats\n- Wants SSO before signing\n- Decision by 15 October",
    "Hi Priya, thanks for today's call. We'll confirm SSO timing by Friday so you can decide by 15 October.",
])

def ask(prompt):
    return llm.complete([{"role": "user", "content": prompt}]).text.strip()

facts = ask("List the facts from this sales call as bullets:\n<transcript>...</transcript>")
if "October" not in facts:                       # the gate: no decision date, no follow-up email
    raise ValueError("The call notes have no decision date; send them to the account manager")
email = ask(f"Write a two-sentence follow-up email from these facts:\n{facts}")
email
```

Chaining trades latency (calls run one after another) for accuracy and debuggability: when the
email is wrong, you can see whether the facts were wrong first.

## Routing

Classify the input, then hand it to a prompt (or a model) built for that kind. A support inbox
gets billing, technical and sales questions. One prompt for all three is mediocre at each, and a
router lets every handler have focused instructions. It also saves money, because simple
categories can go to a small model.

```python
from plp_fakes import ScriptedLLM

HANDLERS = {"billing": "You answer billing questions for Northwind. Never promise refunds.",
            "technical": "You are Northwind's support engineer. Ask for error messages and steps."}

llm = ScriptedLLM(["Billing", "Invoice INV-2291 was charged twice because..."])
ticket = "I was charged twice for September!"
label = llm.complete([{"role": "user", "content": f"Label as billing, technical or sales:\n{ticket}"}],
                     temperature=0, max_tokens=5).text.strip().lower()
route = label if label in HANDLERS else "human"
reply = llm.complete([{"role": "user", "content": ticket}], system=HANDLERS[route]).text if route != "human" else None
route, reply
```

The label comes from a fixed list, it's normalised, and anything unexpected goes to a person. That's
A3's classification, used as a switch.

## Parallelisation

When calls don't depend on each other, run them at the same time. Briefs for ten accounts, five
checks on one contract, the same question asked three times for a majority vote: done one after
another that's ten round trips, and done with `asyncio.gather` it takes about as long as the slowest.

Your A2 client is synchronous. For this, give it an async twin with the same interface over
`httpx.AsyncClient`, as in module 12:

```python norun
class AsyncAnthropicClient:
    def __init__(self, api_key, model, http: httpx.AsyncClient):
        self._key, self.model, self._http = api_key, model, http

    async def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        response = await self._http.post("https://api.anthropic.com/v1/messages", json=..., headers=...)
        return parse_anthropic(response.json())     # the same parsing as your sync adapter
```

In drills, an async wrapper around `ScriptedLLM` stands in for it. A semaphore caps how many calls
are in flight, because providers rate-limit you:

```python
import asyncio

from plp_fakes import ScriptedLLM

class AsyncFake:
    def __init__(self, replies):
        self.sync = ScriptedLLM(replies)
    async def complete(self, messages, **options):
        await asyncio.sleep(0.01)                  # pretend to wait on the network
        return self.sync.complete(messages, **options)

async def briefs(llm, companies, limit=3):
    gate = asyncio.Semaphore(limit)
    async def one(company):
        async with gate:
            response = await llm.complete([{"role": "user", "content": f"Two-line brief for {company}"}])
            return response.text
    return await asyncio.gather(*(one(c) for c in companies))

llm = AsyncFake([lambda request: "Brief: " + request["messages"][0]["content"].split(" for ")[1]] * 3)
asyncio.run(briefs(llm, ["Harbour Dental", "Kiln & Co", "Brightline"]))
```

`gather` returns results in the order you passed the coroutines, whatever order they finish in, so
results line up with inputs. The scripted replies here are functions of the request, because with
concurrency the order in which calls arrive isn't the order you wrote them.

> [!WARNING]
> Decide what one failure does. By default `gather` raises the first exception and you lose the
> other results. Catch errors inside each task (or use `return_exceptions=True`) when one failed
> brief shouldn't cost you the other nine.

## Orchestrator and workers

Parallelisation splits work in a way you fixed in advance. Sometimes the split depends on the
input: "research these three vendors" has three parts, "prepare the renewal review" has
however many the account needs. An **orchestrator** call decides the subtasks at run time, as
JSON; **workers** do one each (in parallel); a **synthesiser** combines their findings.

```python
import json

from plp_fakes import ScriptedLLM

llm = ScriptedLLM([
    json.dumps([{"title": "Support history", "instructions": "Summarise open and recent tickets"},
                {"title": "Billing", "instructions": "Unpaid invoices and payment habits"}]),
    "Support: 2 open tickets, one urgent (export fails).",
    "Billing: INV-2291 is 18 days overdue; usually pays within 10 days.",
    "Harbour Dental review: fix the export before the call, and raise INV-2291 gently.",
])
subtasks = json.loads(llm.complete([{"role": "user", "content": "Split into subtasks, as JSON: renewal review for Harbour Dental"}]).text)
if not 1 <= len(subtasks) <= 4:
    raise ValueError(f"Expected 1 to 4 subtasks, got {len(subtasks)}")
findings = [llm.complete([{"role": "user", "content": f"{s['title']}: {s['instructions']}"}]).text for s in subtasks]
llm.complete([{"role": "user", "content": "Combine:\n" + "\n".join(findings)}]).text
```

It's the closest pattern to an agent, with one crucial difference: the model decides the plan
once, your code checks it (a cap on subtasks, as in lesson 5), and the rest is fixed.

## Evaluator and optimiser

One model writes; another scores the result against criteria and says what to improve; loop
until the score passes or the rounds run out. It's lesson 5's critique loop with two changes: the
judge is a separate call (often a different, stronger or cheaper model) that returns a **score**,
and because you have scores, you can keep the **best** draft rather than the last one. Revisions
sometimes make things worse.

```python
import json

from plp_fakes import ScriptedLLM

writer = ScriptedLLM(["Draft A: Hi Priya, want a demo?", "Draft B: Hi Priya, three clinics like yours cut no-shows 30%..."])
judge = ScriptedLLM([json.dumps({"score": 5, "feedback": "Too vague; give a concrete result."}),
                     json.dumps({"score": 8, "feedback": "Specific and short."})])

draft, best = writer.complete([{"role": "user", "content": "Cold email to Harbour Dental's practice manager"}]).text, None
for round_number in range(1, 4):
    verdict = json.loads(judge.complete([{"role": "user", "content": f"Score 0-10 as JSON:\n{draft}"}], temperature=0).text)
    if best is None or verdict["score"] > best[1]:
        best = (draft, verdict["score"])
    if verdict["score"] >= 8:
        break
    draft = writer.complete([{"role": "user", "content": f"Improve: {verdict['feedback']}\n\n{draft}"}]).text
best
```

## Choosing a pattern

| Pattern | Use it when | Model calls |
|---------|-------------|-------------|
| Prompt chaining | the job splits into fixed steps, each easier alone | one per step |
| Routing | inputs fall into kinds that need different handling | 1 + 1 |
| Parallelisation | parts are independent, or you want several votes | n, at once |
| Orchestrator and workers | the parts depend on the input | 1 + n + 1 |
| Evaluator and optimiser | quality can be judged, and a revision helps | 2 per round |

```quiz
question: A client wants each inbound lead's website summarised, then scored against their ideal customer profile, then a Slack message written for leads scoring above 70. Which pattern fits best?
options:
  - "An agent with web, scoring and Slack tools"
  - "A prompt chain: summarise, then score, then an if statement, then write the message"
  - "Orchestrator and workers"
answer: 1
explain: The steps are fixed and each depends on the one before, which is a chain. The threshold is a gate in code between the score and the message. Nothing about the split depends on the input, so an orchestrator adds a call for no benefit.
```

## Where this leaves you

Chains run fixed steps with checks between them. Routers classify, then hand off to a focused
prompt. `asyncio.gather` with a semaphore runs independent calls at once, results in input order.
An orchestrator decides the subtasks at run time, checked in code, and workers do them. An
evaluator scores a writer's drafts, and you keep the best. The drills build each one.
