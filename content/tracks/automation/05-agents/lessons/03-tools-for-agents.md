---
slug: tools-for-agents
title: Tools an agent can use on its own
summary: Observations that stay small, results in pages, errors that say what to do next, descriptions that say when to stop, and defaults that are cheap and harmless.
minutes: 40
exercises:
  - agent-clip-observation
  - agent-fix-unhelpful-errors
  - agent-page-results
  - agent-tool-wrapper
---

A3 taught you to design tools a model calls correctly: verb_noun names, typed arguments, small
results, idempotent writes. An agent raises the stakes, because nobody is watching between steps.
A sales research assistant preparing for a call with Harbour Dental might make fifteen tool calls
in a row, and every weakness in a tool gets hit, repeated, and paid for on each of them. A result
that's too big is resent on every later step. An error that says `400` gets retried until the
step cap. This lesson is about tools that hold up when the model is on its own.

## Observations are paid for on every later step

A tool result goes into the history, and the history is resent on every step after it. A 30,000
character CRM export returned at step 2 of a ten-step run is paid for eight more times, and it
pushes the useful parts of the conversation further from the model's attention. The fix has two
parts: return less in the first place (only the fields the task needs, as A3 showed), and put a
hard limit on whatever gets through.

```python
def clip(text, limit=2000):
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n[cut: showing {limit:,} of {len(text):,} characters. Ask for less: a narrower query or the next page.]"

notes = "Call with Priya, 12 Sept: wants SSO before renewal. " * 400
observation = clip(notes)
len(notes), len(observation), observation[-100:]
```

The note at the end matters as much as the cut. It tells the model the result is incomplete and
what to do about it, so it doesn't treat the first 2,000 characters as everything there is.

> [!TIP]
> Clip by characters in the tool layer, where it's cheap and predictable. Counting real tokens
> needs the provider's tokenizer; four characters a token is close enough for a safety limit.

## Page, don't dump

Search tools are the worst offenders. `search_deals("dental")` might match 300 deals. Return the
first page, and say how to get the next:

```python
DEALS = [{"id": f"D-{n}", "company": f"Dental practice {n}", "stage": "proposal", "value": 1200 + n,
          "owner_notes": "long internal notes..."} for n in range(1, 301)]

def search_deals(query, page=1, page_size=10):
    matches = [d for d in DEALS if query.lower() in d["company"].lower()]
    start = (page - 1) * page_size
    results = [{k: d[k] for k in ("id", "company", "stage", "value")} for d in matches[start:start + page_size]]
    more = start + page_size < len(matches)
    return {"results": results, "total": len(matches), "page": page, "next_page": page + 1 if more else None}

first = search_deals("dental")
first["total"], first["next_page"], first["results"][0]
```

`total` tells the model how big the answer is, so it can narrow the query instead of paging through
thirty pages. `next_page` makes the way forward explicit. Cap `page_size` too, or the model will
ask for 500 at once.

## Errors the model can act on

The wrong way first. Here are three error observations from a real CRM integration:

```python
bad_errors = ['{"error": "400"}', '{"error": "KeyError(\'C-999\')"}', '{"error": "Tool failed"}']
bad_errors
```

The model can't do anything useful with these, so it does the one thing it can: calls the tool
again, with the same arguments, until the step cap. A good error answers the question the model
has, *what should I do now?* Tool errors come in three kinds, and each needs a different answer:

| Kind | Example | What the error says |
|------|---------|---------------------|
| The model can fix it | wrong argument name, bad format | what the tool accepts: `get_contacts takes: company_id, limit` |
| Try another way | no such company, id unknown | where to get a good input: `Get an id from find_company first` |
| Nobody can fix it now | the CRM is down | not to retry: `Continue without it, or finish and say what's missing` |

```python
import json

class CompanyNotFound(LookupError):
    pass

def get_contacts(company_id, limit=10):
    raise CompanyNotFound(f"No company with id {company_id}. Get an id from find_company first.")

try:
    get_contacts("C-999")
except CompanyNotFound as error:
    observation = json.dumps({"error": str(error)})
observation
```

The third kind is where internal details leak. A database error message contains hostnames, table
names and sometimes query text. Log it for yourself, and give the model a plain sentence instead.

```quiz
question: The CRM API is timing out. Which observation leads to the best agent behaviour?
options:
  - '{"error": "ReadTimeout: crm.internal:443 read timed out after 10s"}'
  - '{"error": "get_contacts is unavailable right now. Don''t retry it; continue with what you have, or finish and say what''s missing."}'
  - '{"error": "Please try again"}'
answer: 1
explain: It tells the model the tool won't work if it tries again, and gives it two good ways forward. The first leaks an internal hostname and invites a retry; the third asks for a retry outright, which in an agent means spending the remaining steps on a dead tool.
```

## Descriptions that tell the agent when to stop

In A3 a description said what a tool does, when to use it and what it returns. For an agent, add
two more things: **what to call next**, and **what it costs**.

```python
tool = {
    "name": "get_company_news",
    "description": (
        "Recent news about one company: up to 5 headlines with dates and URLs. Slow (about 5 seconds) "
        "and counts against the news API quota, so call it once per company, after find_company has "
        "given you the company_id. If it returns no headlines, don't retry with other spellings: "
        "say there was no recent news."
    ),
    "parameters": {"type": "object", "required": ["company_id"],
                   "properties": {"company_id": {"type": "string", "description": "An id from find_company, e.g. C-301"}}},
}
len(tool["description"].split())
```

"Don't retry with other spellings" is the kind of sentence you only write after reading a trace
where the agent tried seven. Traces are how you find out what to put in descriptions.

## Safe defaults

When the model leaves an argument out, the default decides what happens, so make every default the
**cheap and harmless** choice:

- **Small limits.** `limit=10`, not "everything".
- **Narrow windows.** `days=7` for log searches, not all time.
- **Read before write.** Separate `preview_campaign` from `send_campaign`, or give writes
  `dry_run=True` by default, so a model that isn't sure gets a preview.
- **Nothing irreversible by default.** A delete tool should need an explicit `confirm=True`, and
  lesson 7 puts a person in front of it anyway.

```python
def send_campaign(segment, subject, dry_run=True):
    recipients = {"trial-ending": 412, "churned": 1_930}[segment]
    if dry_run:
        return {"dry_run": True, "would_send_to": recipients,
                "next": "Call again with dry_run=false only if the user asked you to send."}
    return {"sent": recipients}

send_campaign("churned", "We miss you")
```

The model gets a useful answer (1,930 people would get this email) without anything being sent,
and the result tells it the exact condition for going further.

## Where this leaves you

Every observation is resent on each later step, so clip results with a note saying they were cut,
and page searches with a total and a `next_page`. Write errors that tell the model what to do next,
and keep internal details in your logs. Describe when to call a tool, what to call after it, and
when to give up. Make every default the cheap, harmless choice. The drills clip observations, fix a
CRM toolset's useless errors, page search results, and wrap any function as an agent-safe tool.
