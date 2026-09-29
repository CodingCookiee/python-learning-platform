---
slug: agent-memory
title: Memory
summary: The model remembers only what you send it. Trim history without breaking tool-call pairs, summarise what you drop with a model call, keep long-term facts in a store searched by embeddings, and give the agent a scratchpad.
minutes: 50
exercises:
  - agent-history-tokens
  - agent-fix-orphaned-tool-results
  - agent-summarise-history
  - agent-memory-store
  - agent-scratchpad
---

A support agent for a software company talks to Priya from Harbour Dental about a broken export.
Forty messages in, it has looked up her account, read three tickets and tried two fixes, and the
conversation no longer fits comfortably in the context window. Next week she writes again, and
the agent has no idea who she is. Both are memory problems, and the model solves neither: it
remembers nothing between calls. Everything it "knows" is what your code sends, so memory is a
design decision in your code. This lesson covers the three kinds agents use.

## The history is the memory

Within one run, the agent's memory is the message list, and it's resent in full on every call.
Measure it the way the fakes do, at about four characters per token:

```python
import json
import math

def estimate_tokens(text):
    return math.ceil(len(text) / 4)

def history_tokens(messages):
    total = 0
    for m in messages:
        total += estimate_tokens(m.get("content") or "")
        if m.get("tool_calls"):
            total += estimate_tokens(json.dumps(m["tool_calls"]))
    return total

conversation = [{"role": "user", "content": "Our CSV export has failed since Monday. Account C-301."}]
for n in range(12):
    conversation.append({"role": "assistant", "content": "", "tool_calls": [
        {"id": f"c{n}", "name": "get_ticket", "arguments": {"ticket_id": f"T-{880 + n}"}}]})
    conversation.append({"role": "tool", "tool_call_id": f"c{n}", "content": "Ticket details... " * 40})
len(conversation), history_tokens(conversation)
```

Twenty-five messages and over 2,000 tokens, resent on every call. Past some size you have to
choose what to keep. The drills' first job is writing this count.

## Trim without breaking tool pairs

The simplest policy: keep the task (the first message) and the most recent messages. The obvious
code for it has a bug:

```python
def trim(messages, keep_last):
    return [messages[0]] + messages[-keep_last:]

history = [
    {"role": "user", "content": "Why does my export fail? Account C-301."},
    {"role": "assistant", "content": "", "tool_calls": [{"id": "c1", "name": "get_account", "arguments": {"account_id": "C-301"}}]},
    {"role": "tool", "tool_call_id": "c1", "content": '{"plan": "growth"}'},
    {"role": "assistant", "content": "", "tool_calls": [{"id": "c2", "name": "get_export_log", "arguments": {"account_id": "C-301"}}]},
    {"role": "tool", "tool_call_id": "c2", "content": '{"error": "row 88: invalid date 31/02/2026"}'},
    {"role": "assistant", "content": "Row 88 has an invalid date, 31/02/2026. Fix it and export again."},
]
[m["role"] for m in trim(history, keep_last=2)]
```

With `keep_last=3` that happens to work. With `keep_last=2`, as here, the kept part starts with
the tool result for `c2`, and the assistant message that asked for it has been cut. Both providers
reject that request with a 400: a tool result must follow the call it answers. This check catches
it before a provider does:

```python raises
def check_history(messages):
    called = set()
    for m in messages:
        for call in m.get("tool_calls") or []:
            called.add(call["id"])
        if m["role"] == "tool" and m["tool_call_id"] not in called:
            raise ValueError(f"Tool result {m['tool_call_id']} has no matching tool call before it")

history = [
    {"role": "user", "content": "Why does my export fail? Account C-301."},
    {"role": "tool", "tool_call_id": "c2", "content": '{"error": "row 88: invalid date"}'},
    {"role": "assistant", "content": "Row 88 has an invalid date."},
]
check_history(history)
```

The fix is to move the cut: if the kept part would start on a tool result, start after it instead
(or before its assistant message, if you'd rather keep more). A tool call and its results are one
unit. Keep them together or drop them together.

## Summarise what you drop

Trimming forgets. Often that's fine, but "the customer already tried re-exporting" is exactly the
kind of fact that falls off the front of a long conversation. So before dropping the older
messages, **summarise them with a model call**, and put the summary where they were:

```python
from plp_fakes import ScriptedLLM

SUMMARY_PROMPT = ("Summarise this support conversation for the agent that continues it. Keep ids, "
                  "facts found, what was tried and what's still open. At most 120 words.")

older = [
    {"role": "user", "content": "Export fails since Monday, account C-301."},
    {"role": "assistant", "content": "Could you try exporting a single month?"},
    {"role": "user", "content": "Tried September only, same error."},
]
transcript = "\n".join(f"{m['role']}: {m['content']}" for m in older)
llm = ScriptedLLM(["Account C-301: CSV export failing since Monday. Customer re-tried with September only; same error."])
summary = llm.complete([{"role": "user", "content": f"{SUMMARY_PROMPT}\n\n<transcript>\n{transcript}\n</transcript>"}],
                       max_tokens=300).text
compacted = [{"role": "user", "content": f"Why does my export fail?\n\nSummary of the conversation so far:\n{summary}"}]
compacted[0]["content"]
```

The summary call is cheap next to what it saves: it runs once, on a small model if you like, and
every later call sends 40 words instead of 2,000 tokens. Summarise only when the history passes a
threshold, not on every step, and always keep the most recent messages verbatim. Those are what
the model is working on right now.

> [!WARNING]
> A summary is lossy, and the model writing it can drop the one detail that mattered. Keep ids,
> amounts and decisions in structured state (the scratchpad below) rather than trusting a
> summary to carry them.

## Long-term memory

Next week Priya writes again. A **long-term store** carries facts across conversations: "Priya
prefers email", "Harbour Dental renews in March". It's A4's retrieval, pointed at memories instead
of documents: embed each fact when you store it, embed the question when you need it, and hand the
closest few to the model.

```python
from plp_fakes import cosine, fake_embed

memories = ["Priya prefers email over phone calls",
            "Harbour Dental renews their contract in March",
            "Kiln & Co pays invoices late every quarter"]
vectors = fake_embed(memories)                     # embed once, when each memory is written

query = fake_embed("When does Harbour Dental renew?")[0]
scored = sorted(((cosine(query, v), text) for v, text in zip(vectors, memories)), reverse=True)
[(round(score, 2), text) for score, text in scored if score >= 0.2]
```

Three decisions shape a store:

- **What to remember.** Facts and preferences that will matter later, not every message. Either the
  agent calls a `remember(fact)` tool, or a cheap model call extracts facts when a conversation ends.
- **Whose memory it is.** Store the customer id with each memory and filter on it before ranking,
  so one customer's facts never appear in another's conversation.
- **How much to recall.** Top few, above a minimum score. A weak match is worse than nothing,
  because the model will try to use it.

Recalled memories go into the system prompt, labelled as notes from earlier conversations, so the
model treats them as context rather than instructions.

## A scratchpad

Within a long task, a **scratchpad** is memory the agent writes on purpose: a `take_note` tool
whose notes your loop keeps outside the message history and includes in every call. When the
history is trimmed, the notes survive.

```python
notes = []

def take_note(text):
    notes.append(text)
    return {"saved": len(notes)}

take_note("Export fails on row 88: invalid date 31/02/2026")
take_note("Customer already re-tried with one month; same error")
system = "You are Northwind's support agent.\n\nYour notes so far:\n" + "\n".join(f"- {n}" for n in notes)
print(system)
```

This is how long-running agents keep their place: the history holds the last few steps in full,
the notes hold what was learned, and the task never moves. It also gives you a readable record of
the agent's reasoning, next to the trace of what it did.

```quiz
question: A research agent trims its history to the last 6 messages. Where should it keep the URLs of the sources it has read, so it can cite them at the end?
options:
  - "In the history: the model will remember them"
  - "In a scratchpad or state your loop keeps, included in every call"
  - "In a long-term memory store, retrieved by similarity at the end"
answer: 1
explain: The history loses them as soon as they're trimmed, and a similarity search might not bring back all of them. Sources the final answer depends on are state, so keep them in a structure your code controls, and show them to the model on every call.
```

## Where this leaves you

The model remembers only what you send. Count the history, trim it without splitting a tool call
from its results, and summarise what you drop with a model call when the details matter. Keep
facts across conversations in a store searched by embeddings, filtered by customer. Give long
tasks a scratchpad that survives trimming. The drills count history, fix a trim that orphans tool
results, compact a conversation with a summary, build a memory store over `fake_embed`, and write
an agent with a scratchpad.
