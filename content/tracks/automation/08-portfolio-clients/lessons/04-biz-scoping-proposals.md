---
slug: biz-scoping-proposals
title: Scoping, proposals and contracts
summary: Write a statement of work with deliverables that can be accepted, an out-of-scope list, milestones, change requests and the risks particular to AI, then cover the contract basics and when to say no.
minutes: 50
exercises:
  - biz-missing-sections
  - biz-lint-sow
  - biz-fix-proposal-criteria
  - biz-milestone-invoices
  - biz-build-proposal
---

The agency liked your range and wants a proposal. The document you send now decides how the
project ends: with a signed-off handover and a paid final invoice, or with a month of "we thought
that was included". Almost every client dispute comes back to a scope that one side read
differently from the other. This lesson is about writing one that can't be read two ways, and
the drills turn its rules into checks you run before anything is sent.

## Six sections of a statement of work

A **statement of work** (SOW) says what you'll deliver, how everyone will know it's done, and what
it costs. Keep it short, and always include these six sections:

| Section | Answers |
|---------|---------|
| **Goal** | why the client is paying, in one or two sentences, in their words |
| **Deliverables** | the things you'll hand over, numbered |
| **Acceptance criteria** | for each deliverable, the checks that mean it's done |
| **Out of scope** | what you won't do, written down so no one assumes it |
| **Milestones** | the stages, their dates and what's invoiced at each |
| **Assumptions and risks** | what must be true for the price to hold, and what could go wrong |

```python
REQUIRED = ["Goal", "Deliverables", "Acceptance criteria", "Out of scope", "Milestones", "Assumptions and risks"]
draft = "## Goal\n...\n## Deliverables\n...\n## Milestones\n..."
present = {line[3:].strip() for line in draft.splitlines() if line.startswith("## ")}
[name for name in REQUIRED if name not in present]
```

Send the SOW as a short document, not a slide deck. It becomes part of the contract, and in six
weeks, when someone asks "was that included?", you'll both open it.

## Deliverables someone can accept

A deliverable is only useful if the client can check it without asking you. Words like
"improve", "optimise" and "streamline" can't be checked, and "etc." and "as needed" have no end.
Rewrite each one until it names a thing, a number and a condition:

| Vague | Can be accepted |
|-------|-----------------|
| Improve the reporting process | A report for each of the 12 clients, emailed by 09:00 on the first working day of the month |
| Chatbot answers FAQs, bookings, etc. | Answers the 40 questions in the agreed FAQ list, and books, moves and cancels appointments |
| Better ticket routing | At least 90% of the agreed 200-ticket test set routed to the right queue |

That last row is how you accept an AI deliverable. The model will sometimes be wrong, so the
criterion is a **score on an agreed test set**, the golden dataset from A7, measured the same way
before and after launch, never "routes tickets correctly".

```python
deliverables = ["Improve the reporting process", "Reminder texts sent 24 hours before each appointment"]
[(text, any(ch.isdigit() for ch in text)) for text in deliverables]
```

> [!TIP]
> Write the acceptance criteria with the client, from the "What would make you say this was worth
> it?" answer in the discovery call. Criteria they helped write are criteria they'll sign off.

## Out of scope, and change requests

List what you won't do, especially the things the client might reasonably assume: "changes to the
agency's ad accounts", "reports for clients added after sign-off", "support outside working hours",
"the second language". An out-of-scope list feels negative to write and saves you every time.

Scope will still change, because the client learns what they want by seeing it. That's fine, as
long as every change goes through a **change request**: written down, estimated, priced, and
approved before any work starts, with its effect on the dates stated.

```python
from datetime import date, timedelta
from decimal import Decimal

# EXAMPLE: the agency asks for a PDF version of each report
hours, rate, buffer = 6, Decimal("60"), Decimal("0.2")
price = hours * (1 + buffer) * rate
handover = date(2026, 12, 7)
{"price": price, "new handover": handover + timedelta(days=3)}
```

```quiz
question: "Midway through the build, the account manager asks, 'Could it also post each report in the client's Slack? Should be quick.' What do you do?"
options:
  - Build it. It is quick, and it keeps the client happy
  - Say it's out of scope and refuse
  - "Say it's not in the current scope, send a short change request with the price and the effect on the dates, and build it once it's approved"
answer: 2
explain: "Small unrecorded changes are how fixed-price projects lose money. A written change request keeps goodwill and the margin, and it's often approved the same day."
```

## Milestones and getting paid

Split a fixed price into a **deposit** before you start (30 to 50% is common) and payments tied to
milestones the client **accepts**, not to dates on a calendar. Put payment terms in writing, for
example invoices due within 14 days, and hand over ownership of the code and the production
credentials with the final payment. Round each invoice to the cent and let the last one take the
remainder, so the invoices always add up to the price exactly.

```python
from decimal import Decimal

total = Decimal("6000")
[(name, total * percent / 100) for name, percent in [("Deposit", 30), ("Pilot", 40), ("Handover", 30)]]
```

## Risks that are particular to AI work

Every project has risks. AI automations have a few extra ones, and naming them in the proposal,
with what you'll do about each, shows the client that you've done this before:

| Risk | Mitigation to propose |
|------|-----------------------|
| **Data access**: the export, API or permission doesn't arrive | access by a stated week is an assumption; the dates move if it's late |
| **API limits and cost**: rate limits, quotas, usage growing faster than expected | batching and backoff, a monthly AI cost estimate and a cap |
| **Model behaviour**: wrong or inconsistent outputs | acceptance on a test set, human review for the risky cases, figures filled in by code |
| **Provider changes**: a model is retired or its price changes | the neutral client from A2, and model updates in the retainer |
| **Personal data**: customers' details sent to a third party | the minimum data sent, providers named in the contract, retention agreed |

```quiz
question: "Which of these belongs in the 'Assumptions and risks' section rather than in the acceptance criteria?"
options:
  - "At least 90% of the 200-ticket test set is routed correctly"
  - "The client provides read-only access to the helpdesk API by week 1"
  - "The daily report arrives by 08:00"
answer: 1
explain: "Access is something the client must provide for your price and dates to hold: an assumption. The other two are checks on what you deliver."
```

## The contract around the SOW

> [!WARNING]
> This section is general information, not legal advice. Contract and data protection law differ
> between countries, and sometimes between states or free zones. For your first contracts, pay a
> local lawyer to review a template you can reuse. It's cheaper than your first dispute.

Many freelancers use a **master services agreement** (MSA), signed once, with a short SOW for each
project. Between them, make sure these are covered:

- **Payment**: the amounts, due dates, and what happens when a payment is late (work pauses).
- **Intellectual property**: usually the client owns the code written for them once they've paid
  in full, and you keep your pre-existing tools and generic libraries, which the client gets a
  licence to use. Say so explicitly, or you can't reuse your own helpers on the next project.
- **Confidentiality**, both ways.
- **Data processing**: if you'll touch personal data (patients, customers, staff), agree how it's
  handled: where it's stored, which providers process it, how long it's kept, and how it's deleted
  at the end. In many places this is a legal requirement with its own agreement, often called a
  data processing agreement.
- **AI disclosure**: which parts of the system use AI, which providers, whether they may keep or
  train on the data, and the system's known limits. If the automation talks to the client's
  customers, agree how they're told it's automated. Rules on this are appearing in many markets.
- **Liability**: a cap, usually tied to the fees paid, and no promise about outcomes you don't
  control.
- **Ending it**: how either side can stop, and what's paid for work done.

```python
clauses = {"payment", "ip", "confidentiality", "data processing", "ai disclosure", "liability", "termination"}
signed = {"payment", "ip", "confidentiality", "liability"}
sorted(clauses - signed)
```

## When to say no

Some work you should decline, however good the fee: a goal that deceives people or breaks the law
(fake reviews, messages to people who never agreed to them, scraping personal data); a client who
won't give you access to the data the work depends on; a budget far below what the work costs,
which you'd end up subsidising; a promise, such as 100% accuracy, that no one could keep; or work
beyond your skills, where the honest answer is a referral. Say no briefly and politely, and where
you can, suggest what they could do instead. People you turn down well often come back, or send
someone else.

```quiz
question: "A shop wants an automation that posts reviews of its products from made-up customers. It's quick work and they'll pay well. What's the right answer?"
options:
  - Take it, since the client is responsible for how it's used
  - Take it, but only post a few reviews a week
  - "Decline, and offer to automate asking real customers for reviews instead"
answer: 2
explain: "Fake reviews deceive the shop's customers and are against the law or platform rules in many markets. Decline clearly, and offer the honest version of the same goal."
```

## Where this leaves you

A statement of work has six sections. Deliverables name a thing, a number and a condition, AI
deliverables are accepted on a test set, and whatever isn't included is listed as out of scope.
Changes go through written change requests, payments follow accepted milestones, and AI-specific
risks are named with their mitigations. Around it sits a contract covering payment, IP, data, AI
disclosure and liability, and you'll turn some work down. Next: delivering the work, and handing it
over so it keeps running without you.
