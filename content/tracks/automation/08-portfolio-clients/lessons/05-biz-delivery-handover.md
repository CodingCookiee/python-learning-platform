---
slug: biz-delivery-handover
title: Delivery, handover and retainers
summary: Deliver in small visible steps, hand over a system the client can run without you, route the monitoring to them, sell a maintenance retainer, and write an SLA that promises only what you control.
minutes: 45
exercises:
  - biz-predict-uptime
  - biz-handover-checklist
  - biz-retainer-invoice
  - biz-sla-review
  - biz-fix-sla-deadline
---

Building the automation is half the job. The client is paying for a system that keeps working after
you've moved on to the next project, and for someone to call when it doesn't. That second part is
where freelancers either build a recurring income or collect a list of old clients who remember them
as "the developer who disappeared". This lesson covers delivering in a way the client can follow,
the handover pack, monitoring they can see, the retainer that pays you to look after it, and an
SLA that doesn't promise the impossible.

## Deliver in small, visible steps

Clients get nervous when they can't see progress, and nervous clients start asking for changes.
Three habits prevent most of it:

- **A short weekly update**, on the same day each week: what's done, what's next, what's blocked,
  and any decision you need from them.
- **An early demo on real data.** A rough version running on last week's actual appointments
  surfaces "oh, we also have walk-ins" in week one instead of week five.
- **A pilot before the full launch**: one clinic chair, two agency clients, one warehouse. It's also
  where you measure the "before" numbers for the case study (lesson 6).

```python
week = {"done": ["Reminders send for the pilot chair"], "next": ["Add the SMS consent check"],
        "blocked": ["Waiting for the practice software API key"],
        "decisions": ["Should Saturday appointments get a reminder on Friday or Saturday morning?"]}
for heading, items in week.items():
    print(heading.capitalize())
    for item in items or ["Nothing this week"]:
        print(" -", item)
```

Acceptance is the last step of delivery: go through the acceptance criteria from the SOW with the
client, one by one, and record that each one passed. That record is what the final invoice refers to.

## The handover pack

A handover is finished when the client could run the system if you were unreachable for a month.
The pack is the same for every project:

| Item | What it contains |
|------|------------------|
| `README.md` | what the system does, how it's deployed, how to run it and its tests |
| `RUNBOOK.md` | what it does, how to tell it's working, common failures and their fixes, how to restart it, who to call |
| `.env.example` | every setting and secret it needs, by name, with no values |
| Credentials | every account (the AI provider, hosting, SMS, the database) in the **client's** name and billing, with you added as a user |
| Monitoring | alerts that reach someone at the client, not only you |
| Training | a recorded session with the people who'll use it and the person who'll own it |

Secrets are handed over by adding them to the client's own accounts, never in a zip file or a
repository. And make sure the client knows how to switch it off. A clearly documented off switch
is the most reassuring page in the runbook.

```python
files = ["README.md", "RUNBOOK.md", "deploy/.env"]
required = ["README.md", "RUNBOOK.md", ".env.example"]
[name for name in required if name not in files], [f for f in files if f.endswith("/.env")]
```

## A runbook entry that works at 07:00

The runbook is read by a practice manager at 07:00, before the first patient arrives, not by a
developer with time to investigate. Write each entry as a symptom, a check, a fix, and when to
escalate:

```text
Symptom:   Patients say they didn't get a reminder yesterday.
Check:     Open the "Reminders" dashboard. Is yesterday's "sent" count near the usual 30-40?
If it's 0: The SMS account may be out of credit. Log in to the SMS provider, top up, then
           press "Resend yesterday's" on the dashboard.
If not:    Check the patient has SMS consent ticked in the practice software.
Escalate:  If neither fixes it, email support@yourstudio.example with the patient's appointment
           time (never their name or number). Response within 4 working hours.
```

```quiz
question: "Which runbook line is most useful to the practice manager?"
options:
  - "Check the worker logs for exceptions in the send_reminders task"
  - "If yesterday's 'sent' count is 0, top up the SMS account and press 'Resend yesterday's'"
  - "Contact the developer if anything goes wrong"
answer: 1
explain: "It names a symptom anyone can see, a check anyone can do, and a fix that needs no code. Log-reading steps belong in a separate technical section, for you or the next developer."
```

## Monitoring you can hand over

A7 built the monitoring: heartbeats, error alerts, cost alerts and eval checks. At handover, decide
who hears what. Alerts the client can act on (the SMS account is out of credit, yesterday's run
didn't happen) go to them. Alerts only you can act on go to both of you, so the client knows
something is happening. A short weekly summary ("312 reminders sent, 2 failed, AI and SMS usage
41.20") keeps the system visible, which is also what keeps a retainer renewed.

```python
from datetime import datetime, timedelta

last_run = datetime(2026, 10, 12, 7, 0)       # from the job's heartbeat
now = datetime(2026, 10, 13, 9, 30)
if now - last_run > timedelta(hours=25):
    print("ALERT to ops@brightsmile.example and you: no reminder run for", now - last_run)
```

## Maintenance retainers

Software around AI goes stale faster than most: providers retire models and change prices, APIs
change, and the client's process moves on. A **maintenance retainer** pays you a fixed monthly
fee to keep it working. Write down what it includes:

- monitoring and responding to alerts, within the SLA;
- fixes for defects, and updates when a provider changes a model, an API or a price;
- a set number of support hours for small changes, with extra hours at an agreed rate, billed in
  stated increments;
- AI and API usage, passed through as in lesson 3;
- a monthly summary, and a notice period for either side to end it.

```python
from decimal import Decimal

fee, included, used, rate = Decimal("400"), 5, Decimal("6.2"), Decimal("60")   # EXAMPLE
extra = max(used - included, 0)
fee + extra * rate
```

Not every client wants a retainer, and that's their call. Offer the alternative in writing:
support at your hourly rate, on a best-effort basis, with no response-time promise. Most clients
choose the retainer once they see the two side by side.

## SLAs for AI systems

A **service level agreement** says what you promise and what happens if you miss it. For AI
systems, be precise about what you actually control:

| You can promise | You can't promise |
|-----------------|-------------------|
| a response within N working hours | a fix within N hours: some problems aren't yours to fix |
| your service's uptime, excluding the AI provider's outages | uptime higher than the provider you depend on |
| a score on the agreed test set, measured monthly | that the model is never wrong |
| a fallback: when the model fails, the task goes to a person's queue | that every request is handled automatically |

Uptime targets hide how little they allow, and a system that needs two services up at once is
less available than either of them. The predict drill works it out. When a promise is broken, the
usual remedy is a **service credit**, a percentage of that month's fee, rather than open-ended
liability, and the contract from lesson 4 should say so.

```quiz
question: "The clinic asks you to guarantee that reminders will 'always be correct'. What should the SLA say instead?"
options:
  - "Reminders will always be correct"
  - "Reminder content is checked against the appointment data on the agreed test set every month, failed sends are retried and then listed for reception, and you respond to incidents within 4 working hours"
  - "Nothing about correctness, to avoid any liability"
answer: 1
explain: "Promise the process around the system: measurement, fallbacks and response times. That's something you control and can show evidence for every month."
```

## Where this leaves you

Deliver in weekly, visible steps with an early demo and a pilot, and close with a recorded
acceptance. Hand over a README, a runbook written for the person who'll read it, an `.env.example`,
credentials in the client's name, monitoring that reaches them, and training. Sell a retainer
with a written scope, and an SLA that promises response times, measured scores and fallbacks, never
perfection. The last lesson turns finished projects into the case studies that win the next one.
