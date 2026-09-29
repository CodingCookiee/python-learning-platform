---
slug: planning-and-reflection
title: Planning and reflection
summary: Ask for a plan first, check it in code, then execute it step by step. Improve important outputs with a critique loop that has a fixed number of rounds, and run the free checks in code before paying for a critic.
minutes: 45
exercises:
  - agent-parse-plan
  - agent-plan-then-execute
  - agent-fix-stale-critique
  - agent-checked-revision
---

The agent from lesson 2 is *reactive*: it decides one step at a time, looking only at what just
happened. That works for an alert, where each finding points to the next. For a job like "prepare
Thursday's renewal call with Harbour Dental", a reactive agent tends to wander: it reads tickets,
remembers the invoices, goes back for the account owner. Two techniques make agents more
deliberate. **Planning** asks for the whole route before taking a step. **Reflection** has the
model check its own work and improve it. Both cost extra calls, and both need limits.

## Plan, then execute

Ask the model for a numbered plan first, with no tools offered, so all it can do is think:

```python
import re

from plp_fakes import ScriptedLLM

PLANNER = ("Write a numbered plan to reach the goal, one tool-sized step per line, at most 5 steps. "
           "Tools: get_account, get_open_tickets, get_unpaid_invoices, search_news.")

llm = ScriptedLLM(["Here's the plan:\n1. Look up the account C-301\n2. List its open tickets\n"
                   "3. Check unpaid invoices\n4. Write the call brief"])
reply = llm.complete([{"role": "user", "content": f"{PLANNER}\n\nGoal: prepare Thursday's renewal call with Harbour Dental (C-301)"}])
plan = [m.group(1).strip() for m in re.finditer(r"^\s*\d+[.)]\s+(.+)$", reply.text, re.M)]
plan
```

Now the plan is data, and that's the point. Before anything runs you can:

- **check it in code**: no more than five steps, nothing that mentions a tool you didn't offer;
- **show it to a person**: "the agent will do these four things, OK?" (lesson 7);
- **execute it cheaply**: each step is small and concrete, so a smaller, cheaper model can often
  do it.

The cost is rigidity. A plan is a guess made before any results came back.

## Executing the plan

The executor takes one step at a time. Each call gets the goal, the whole plan, the results so
far, and which step to do now, with the tools offered. A final call, with no tools, writes the
answer from all the results:

```python
import json

from plp_fakes import ScriptedLLM, tool_call

REGISTRY = {"get_account": lambda account_id: {"name": "Harbour Dental", "renews": "2026-10-02"},
            "get_open_tickets": lambda account_id: [{"id": "T-881", "subject": "Export fails", "urgent": True}]}
plan = ["Look up the account C-301", "List its open tickets", "Write the call brief"]

llm = ScriptedLLM([
    tool_call("get_account", account_id="C-301"),
    tool_call("get_open_tickets", account_id="C-301"),
    "Harbour Dental renews on 2 October; one urgent ticket (T-881, export fails) should be fixed before the call.",
])
results = []
for number, step in enumerate(plan[:-1], start=1):
    prompt = f"Plan:\n{json.dumps(plan)}\n\nResults so far:\n{json.dumps(results)}\n\nDo step {number}: {step}"
    response = llm.complete([{"role": "user", "content": prompt}], tools=["...the tools..."])
    outputs = [REGISTRY[c.name](**c.arguments) for c in response.tool_calls]
    results.append(json.dumps(outputs) if outputs else response.text)
answer = llm.complete([{"role": "user", "content": f"Write the brief from these results:\n{json.dumps(results)}"}]).text
len(llm.calls), answer
```

Three steps, three calls, and each executor call is small: it never carries a long tool history,
only the results. Compare that with the reactive loop, where every step resends everything.

> [!TIP]
> Plan-then-execute and the reactive loop combine well. Let each step be a small agent run of its
> own, with a cap of two or three steps, so a step can recover from a tool error without
> replanning the whole job.

## When the plan meets reality

Step 2 fails: the ticket system is down, or the account has no tickets. A rigid executor carries
on regardless and writes a brief from half the facts. Two better responses:

- **Replan.** Send the goal, the plan, the results so far and the failure, and ask for a new plan
  for what's left. Cap the number of replans (one or two), or a flaky tool becomes an endless
  planning loop.
- **Stop and report.** For work where a missing step makes the output wrong (a month-end close,
  a compliance check), stop with a clear reason instead of improvising.

```quiz
question: A plan-then-execute agent gets a plan of 14 steps for a job you expected to take 4. What should your code do?
options:
  - "Execute it: the model knows best"
  - "Execute the first 4 steps and skip the rest"
  - "Refuse it before anything runs: raise an error, or ask for a shorter plan once"
answer: 2
explain: A plan is data you can check before it costs anything. A limit on plan length is a guardrail like a step cap, and truncating would silently drop steps the plan depends on, like the final write-up.
```

## Reflection: draft, critique, revise

For an output that matters, such as an email a client's customer will read, a second look is worth
paying for. The loop has three prompts: **write** a draft, **critique** it against a checklist,
and **revise** it using the critique. It stops when the critic approves, or after a fixed number
of rounds:

```python
from plp_fakes import ScriptedLLM

llm = ScriptedLLM([
    "Dear Harbour Dental, you owe us money. Pay now or face legal action.",           # draft
    "Too aggressive; don't threaten legal action. Mention the invoice number.",        # critique
    "Hi Harbour Dental team, a reminder that invoice INV-2291 (1,450.00) is 18 days overdue.",  # revision
    "APPROVED",                                                                        # critique
])

def ask(prompt):
    return llm.complete([{"role": "user", "content": prompt}]).text.strip()

draft = ask("Write a payment reminder for INV-2291, 1,450.00, 18 days overdue.")
for round_number in range(1, 4):
    verdict = ask(f"Check this reminder: polite, mentions the invoice number, no threats. "
                  f"Reply APPROVED or list the problems.\n\n{draft}")
    if verdict == "APPROVED":
        break
    draft = ask(f"Revise this reminder.\n\nProblems:\n{verdict}\n\nReminder:\n{draft}")
round_number, draft
```

Two details make or break this loop. The `range(1, 4)` bounds it: without a cap, a critic that
always finds *something* keeps you paying forever. And every critique and revision must use the
**latest** draft. Pass the first draft by mistake and the loop spends its rounds re-reviewing text
nobody will send, which is exactly the bug in the fix drill.

## Free checks first

Some problems don't need a model to find them. Whether the email mentions the invoice number, how
many words it has, whether it says "legal action": those are a line of Python each, they're free,
and they're never wrong. Run them first, and only pay for the critic when the code checks pass:

```python
def code_problems(text, invoice):
    problems = []
    if invoice["number"] not in text:
        problems.append(f"Mention the invoice number {invoice['number']}.")
    if len(text.split()) > 120:
        problems.append(f"Keep it to 120 words; this draft has {len(text.split())}.")
    if "legal action" in text.lower():
        problems.append("Don't mention legal action or late fees.")
    return problems

code_problems("Pay now or face legal action.", {"number": "INV-2291"})
```

The model critic is for what code can't judge: tone, clarity, whether the email makes sense. Rules
the client cares about (never mention late fees, always include the amount) belong in code, where
they're guaranteed rather than requested.

```quiz
question: When is a critique loop worth its cost?
options:
  - "Always: more rounds always mean better output"
  - "For high-value outputs a person or customer will read, with a round limit"
  - "For every tool call, to check the model chose the right tool"
answer: 1
explain: Each round costs at least two more calls, and models are generous graders of their own work, so gains flatten quickly. Spend rounds where quality is visible and valuable, like client-facing emails and reports, and cap them. Tool choices are better checked by validation and traces.
```

## Where this leaves you

Planning turns the route into data you can check, show to a person and execute cheaply, at the
price of rigidity: cap replans, or stop and report. Reflection improves important outputs with a
write, critique and revise loop that always works on the latest draft and stops after a fixed
number of rounds. Free code checks go first, and the model critic judges only what code can't. The
drills parse a plan, execute one, fix a critic that reviews stale drafts, and build a reminder
writer that checks in code before it pays for critique.
