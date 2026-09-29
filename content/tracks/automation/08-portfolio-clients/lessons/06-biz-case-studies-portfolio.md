---
slug: biz-case-studies-portfolio
title: Case studies and a portfolio that sells
summary: Write outcome-first case studies with numbers you can defend, anonymise them properly, build a portfolio from your capstones with READMEs, demos and a one-page site, and do outreach you'd be happy to receive.
minutes: 50
exercises:
  - biz-before-after
  - biz-anonymise
  - biz-fix-anonymiser-url
  - biz-case-study
  - biz-outreach-plan
---

A finished project is only half an asset. The other half is the story of it that a stranger can
read in two minutes and believe: what was wrong, what you did, and what changed, with numbers.
That story wins the next client far more reliably than a list of technologies. This last lesson
covers writing case studies, anonymising them, turning your A1 to A7 capstones into a portfolio,
and finding people to show it to, honestly.

## Result first, then problem and approach

The classic structure is **problem → approach → result**, and it's the right order for thinking.
For reading, put the result first. A prospect skimming your site decides in the headline whether
this is relevant to them:

```text
# No-shows down 63% at a dental clinic

## Result      two to four before-and-after numbers, over a stated period
## Problem     the situation in the client's words: who, what, how often, what it cost
## Approach    three to five steps, in plain language: what you mapped, built, tested, handed over
> quote        one sentence from the client, if they'll give you one
```

Write the approach for the owner, not for a developer: "a scheduled job that texts each patient 24
hours ahead", not "an APScheduler worker calling the Twilio API". The stack can go on one line
under the headline for the technical readers.

```python
metric = {"label": "No-shows", "before": 24, "after": 9}
change = (metric["after"] - metric["before"]) / metric["before"] * 100
f"{metric['label']} {'down' if change < 0 else 'up'} {abs(round(change))}% at a dental clinic"
```

```quiz
question: "Which headline is most likely to make a practice manager read on?"
options:
  - "Building a scheduled SMS reminder service with FastAPI and APScheduler"
  - "No-shows down 63% at a dental clinic, in three months"
  - "How I used AI to transform a dental practice"
answer: 1
explain: "It names a result the reader cares about, a business like theirs, and a timescale. The first is about your tools, and the third promises a transformation without saying what changed."
```

## Numbers you can defend

Every number in a case study should survive the question "how do you know?"

- **Measure the before.** The pilot in lesson 5 is when you record the baseline: calls per morning,
  no-shows per month, hours spent on reports. A "before" reconstructed from memory months later is
  a guess.
- **Measure the after the same way**, over a stated period ("over the first three months").
- **Say where it came from**: the client's booking system, the helpdesk export, a time log.
- **Don't claim what you can't show.** If no-shows fell and the clinic also hired a receptionist,
  say the reminders contributed to the fall.

```python
from decimal import Decimal

before, after = Decimal("2.5"), Decimal("0.5")      # hours a week building reports
f"Report building: {before} → {after} hours a week ({(after - before) / before * 100:+.0f}%)"
```

> [!WARNING]
> Never invent or inflate a number, and never use a client's figures they asked you to keep private.
> One exaggerated case study, found out, costs you every case study you've written.

## Anonymise before you publish

Ask before you publish anything, in writing. A line in your contract ("the supplier may publish an
anonymised case study") makes the conversation easy. Even when a client is happy to be named, their
staff and customers aren't part of that deal. Before publishing, remove or replace:

- the client's name, and anything that identifies it: a unique product, a street, a tiny niche;
- people's names, emails and phone numbers, including those inside links and screenshots;
- exact financial figures: "about 12,000 a month" identifies less than "12,340";
- anything from the client's data: real tickets, real patient messages, real orders.

Emails hide in places a quick check misses, like this naive search:

```python
text = "Booked via https://crm.example/contacts?email=amira@haddadphysio.example&tab=notes"
[word for word in text.split() if word.count("@") == 1 and word.endswith(".example")]
```

It finds nothing, because the address is in the middle of a URL. The drills build an anonymiser
that catches it. Then **read the result yourself**: automated anonymising is a first pass, not a
guarantee, and it won't notice that "the only vegan bakery in the town" names a client just as
clearly as its name would.

```python
from decimal import Decimal

monthly_revenue = Decimal("12340")
f"about {monthly_revenue.quantize(Decimal('1E3')):,.0f} a month"
```

## A portfolio that sells

You already have the projects. Each capstone from A1 to A7 is a case study waiting to be written up:

| Capstone | Sells to |
|----------|----------|
| A1 lead capture pipeline | agencies and service firms losing leads between the form and the CRM |
| A3 support triage service | shops and SaaS teams drowning in their support inbox |
| A4 docs chatbot | firms whose staff or customers can't find answers in their own documents |
| A5 research agent | consultancies and analysts who compile reports by hand |
| A6 business MCP server | teams that want their AI assistants to use their own orders and documents safely |
| A7 harden and deploy | anyone with a prototype that needs to become a system |

Pick the three closest to the clients you want, and make each one easy to judge:

- **A README that leads with the outcome.** The first screen says who it's for, the problem, and
  the result, with a number. The how-to-run section comes after.
- **A demo video of two to three minutes**: the "before" in one sentence, the trigger happening, the
  result appearing, one failure being handled (a bad input, a provider timeout), and what it costs to
  run. Record it with fake data, never a client's.
- **A simple site**: one page with who you help, your offer, the three case studies and a way to
  contact you. A fast, plain page beats an elaborate one you never finish.

```text
# Support triage for online shops

Sorts every support email into the right queue in seconds, drafts the reply, and sends
only the unclear 10% to a person. On a 200-ticket test set: 93% routed correctly.

Demo (2 min) · Case study · How it works · Run it yourself
```

```quiz
question: "What should come first in a portfolio project's README?"
options:
  - "Installation steps, so people can run it"
  - "Who it's for, the problem, and the measured result"
  - "The architecture diagram and the list of technologies"
answer: 1
explain: "The first reader is often a potential client, not a developer. Lead with the outcome. Installation and architecture follow for the people who want them."
```

## A productised offer

A niche from lesson 1 plus a case study becomes a **productised offer**: one problem, one kind of
client, a fixed scope, price and timeline. "Appointment reminders for dental clinics: live in three
weeks, fixed price, with a monthly retainer for SMS, AI and support" is far easier to buy than
"custom AI automation". It's easier to deliver too, because the second clinic reuses the first
clinic's work. Keep the one-pager to what a buyer needs: who it's for, the result to expect, what's
included and what isn't, the timeline, the price, and the next step. The capstone asks you to
write one.

```python
offer = {"for": "dental clinics", "result": "fewer no-shows, no reminder calls",
         "timeline_weeks": 3, "includes": ["SMS and email reminders", "daily unreachable list", "training"]}
f"{offer['result'].capitalize()} for {offer['for']}, live in {offer['timeline_weeks']} weeks."
```

## Outreach, honestly

Start **warm**: people you've worked with, former colleagues, and the communities you already take
part in, where you answer questions and share what you learned long before you mention your
services. Referrals from a happy client are worth more than any campaign; ask for them at handover,
when the client is happiest.

When you do write to a stranger, write the email you'd want to receive: short, specific to them,
about their problem rather than your skills, with one easy question and a clear way to say no.

```text
Subject: Reminder calls at Harbour Road Dental

Hi Priya,

Sara at Brightsmile mentioned your reception team still phones patients about appointments.
We automated that for a clinic nearby: no-shows fell by 63% in three months, and the morning
calls stopped. There's a two-page write-up here: <link>.

Would a 20-minute call next week be useful? If not, no problem, I won't follow up more than once.

Sam
```

Rules to keep, whatever anyone else does:

- **No scraped lists** of personal addresses, and no buying them.
- **No fake familiarity.** Don't say you loved a post you didn't read, and don't pass off
  AI-generated text as a personal note.
- **Follow up at most twice**, a week or more apart, and stop the moment someone replies or asks.
  Keep a suppression list, and honour it forever.
- **Know the rules where you and they are.** Laws on marketing email differ between countries,
  and between writing to a business and to an individual. Many require you to identify yourself
  and offer an opt-out in every message.

```python
email = """Hi Priya, Sara at Brightsmile mentioned your reception team still phones patients..."""
len(email.split()) <= 120
```

## Where this leaves you

Lead case studies with a result, measured before and after the same way, and anonymise them with
code and then with your own eyes. Build the portfolio from your capstones, with outcome-first
READMEs, short demos and a one-page site, and turn a niche into a productised offer. Do outreach
warm first, and cold only when it's personal and easy to refuse.

That's the end of the platform. You can write idiomatic, tested, typed Python; build automations,
agents, RAG systems and MCP servers; run them in production with evals and cost caps; and now
find the work, price it, deliver it and show it. The capstone asks you to publish three case
studies and an offer. Send the first message the same week.
