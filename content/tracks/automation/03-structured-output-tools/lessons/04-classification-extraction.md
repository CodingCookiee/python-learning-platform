---
slug: classification-extraction
title: Classification and extraction pipelines
summary: Closed label sets, an honest "unknown", confidence thresholds that route to people, extraction where code makes the decisions, and batching to cut the cost.
minutes: 45
exercises:
  - struct-route-by-confidence
  - struct-classify-ticket
  - struct-refactor-literal-labels
  - struct-lead-qualification
  - struct-batch-classify
---

A client's support inbox gets 400 emails a day, and two people spend their mornings sorting them
into billing, shipping, returns and technical queues. Sorting is the most common AI automation you'll
be paid to build, and its sibling, pulling fields out of emails and documents, is a close second.
Both are the structured output from the last three lessons with a few design decisions on top,
and those decisions are what separate a demo from something a client trusts with their inbox.

## Labels are a closed set

A classifier that can answer "Billing issue", "billing" and "Payments" is three classifiers. Give
the model a fixed list of labels, each with a one-line definition, and make the contract refuse
anything else. In Pydantic that's a `Literal`:

```python
from typing import Literal
from pydantic import BaseModel, ConfigDict, ValidationError

Category = Literal["billing", "shipping", "returns", "technical", "unknown"]

class TicketLabel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: Category
    confidence: float

try:
    TicketLabel.model_validate({"category": "Billing issue", "confidence": 0.9})
except ValidationError as error:
    message = error.errors()[0]["msg"]
message
```

Two small things in that model pay off. `extra="forbid"` makes Pydantic add
`"additionalProperties": false` to the schema, and with every field required, the model's schema
is already strict: you can pass `TicketLabel.model_json_schema()` straight to `schema=`. And the
same `Literal` generates the enum in the schema and checks the reply, so the list of labels lives
in one place.

In the system prompt, give each label a definition that settles the borderline cases, because
that's where classifiers disagree with people:

```text
Classify the ticket between <ticket> tags into exactly one category:
- billing: charges, invoices, refunds of a payment, changing a card
- shipping: where an order is, delivery dates, damaged parcels
- returns: sending an item back or exchanging it
- technical: the product or website isn't working
- unknown: none of these fit, or the ticket is too unclear to tell
```

## Always have a way out

Leave out `unknown` and the model still has to pick one of four labels for "Hi, is anyone there?"
or a message in a language nobody expected. It will, confidently, and that ticket lands in a queue
where it doesn't belong. An explicit `unknown`, with a definition that says when to use it, turns
those into a signal instead of noise: route them to a person.

```quiz
question: A ticket reads "I was charged twice and my parcel hasn't arrived". With the labels above, what's the most useful design?
options:
  - "Let the model pick whichever label it prefers"
  - "Allow a list of labels, or define in the prompt which one wins when a ticket mentions several issues"
  - "Always use unknown for tickets with two issues"
answer: 1
explain: Multi-issue tickets are common, so decide the rule rather than leaving it to chance. Either make the output a list (categories, with at least one item), or state a priority ("billing wins over shipping, because money is involved") in the label definitions.
```

## Confidence and thresholds

Ask for a `confidence` between 0 and 1 alongside the label, and use it to decide who acts: the
automation, or a person.

```python
def route(label, confidence, threshold=0.75):
    if label == "unknown" or confidence < threshold:
        return "human_review"
    return label

[route("shipping", 0.93), route("billing", 0.55), route("unknown", 0.99)]
```

Be honest with clients about what that number is. A model's self-reported confidence isn't a
calibrated probability: "0.9" doesn't mean it's right 90% of the time. It *is* a useful ranking
signal. Set the threshold by running the classifier on a hundred tickets the client has already
sorted and picking the value where the automated tickets are right often enough for them. That's
the start of an eval, which A7 builds out properly.

## Extraction: the model reads, your code decides

A lead-qualification automation reads an inbound email and decides whether sales should call today.
The tempting design asks the model "is this a hot lead?". The better one asks it only for **facts**,
and makes the decision in code:

```python
from pydantic import BaseModel

class LeadFacts(BaseModel):
    company: str
    seats: int | None
    wants_demo: bool

def qualify(facts):
    if facts.wants_demo and facts.seats is not None and facts.seats >= 20:
        return "hot"
    if facts.wants_demo or (facts.seats or 0) >= 5:
        return "warm"
    return "cold"

qualify(LeadFacts(company="Northwind", seats=40, wants_demo=True)), qualify(LeadFacts(company="Kiln Cafe", seats=None, wants_demo=False))
```

The rules are now visible, testable and changeable: when sales decides "hot" starts at 15 seats,
you change one number and run the tests, instead of rewording a prompt and hoping. The model does
what it's good at (reading messy text) and code does what it's good at (applying rules the same
way every time). Notice `seats: int | None` too: when the email doesn't say, the right answer is
`null`, and the rule has to handle it. A model forced to give a number will invent one.

> [!TIP]
> Extract what the document says, not what it means. `"deadline": "before our March board
> meeting"` as text, plus a separate field for anything you'll compute, keeps the model from
> guessing a date and makes mistakes easy to spot in a review.

## Batching

One ticket per call means paying for the system prompt, the label definitions and the request
overhead 400 times a day. Classify twenty tickets per call instead: give each an id, ask for a
result per id, and match them back up.

```python
import json
from itertools import batched

tickets = {"T-101": "Where is my parcel?", "T-102": "Card declined twice", "T-103": "App crashes on login"}

for batch in batched(tickets.items(), 2):
    payload = [{"id": ticket_id, "text": text} for ticket_id, text in batch]
    print(f"<tickets>\n{json.dumps(payload)}\n</tickets>")
```

Batching changes the failure modes, so the code has to be stricter:

- **Check every id came back.** Models skip items in long lists, especially in the middle. A
  missing id becomes `unknown`, not a silent gap.
- **Ignore ids you didn't send.** A model can invent a `T-104`.
- **Keep one bad item from sinking the batch.** Validate each result on its own, so one invalid
  label costs one ticket, not twenty.
- **Keep batches modest.** Bigger batches are cheaper per item, but a failed reply loses more
  work, and accuracy drops as lists grow. Twenty short tickets is a sensible start; measure.

For work that can wait, both providers also offer a batch API that takes thousands of requests at
once and returns the results within hours at about half the price. That suits a nightly re-sort
of the backlog, not a live inbox.

```quiz
question: A batch of 20 tickets comes back with 19 results. What should the pipeline do?
options:
  - "Retry the whole batch until 20 come back"
  - "Mark the missing ticket unknown (or re-send it on its own) and keep the other 19"
  - "Discard the batch: a missing result means the model got confused"
answer: 1
explain: Nineteen validated results are still good results. The missing one gets the same treatment as any unclassifiable ticket, or goes into the next batch; retrying all twenty repeats work you already paid for.
```

## Where this leaves you

Classify into a closed `Literal` set that includes `unknown`, with a definition for every label.
Ask for a confidence and route anything below a threshold, set on real data, to a person. For
extraction, ask the model for facts with nulls allowed, and make decisions in code. Batch to cut
cost, and check every id on the way back. The drills build a router, a ticket classifier, a
Pydantic refactor, a lead qualifier and a batch classifier.
