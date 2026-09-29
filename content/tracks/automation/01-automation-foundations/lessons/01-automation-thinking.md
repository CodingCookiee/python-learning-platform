---
slug: automation-thinking
title: Automation thinking
summary: Every automation is a trigger, some context, a decision and an action. Learn to see those four parts, and to tell which processes are worth building.
minutes: 35
exercises:
  - auto-hours-saved
  - auto-predict-pipeline
  - auto-payback-months
  - auto-reminder-plan
  - auto-rank-candidates
---

A physiotherapy clinic has a receptionist who spends the first ninety minutes of every day phoning
patients about tomorrow's appointments. About one patient in twenty-five still doesn't turn up, and
each empty slot costs the clinic £60. The owner asks you to "automate the reminders". Before you
write any code, you need to answer two questions: what exactly is the process, and is it worth the
money? This lesson gives you a way to answer both, and the drills turn the answers into code you'll
reuse when you quote for real work.

## Four parts of every automation

Take any automation apart and you find the same four pieces:

| Part | The question it answers | At the clinic |
|------|-------------------------|---------------|
| **Trigger** | When does it run? | Every hour, on a schedule |
| **Context** | What does it need to know? | Tomorrow's appointments, each patient's phone number and SMS consent |
| **Decision** | What should happen, for each case? | Remind booked patients 2–24 hours ahead, by SMS if they allow it, otherwise email |
| **Action** | What does it change in the world? | Send the message, and record that it was sent |

Triggers come in three kinds: a **schedule** (every hour, 08:00 on weekdays), an **event** that
another system sends you (a form was submitted, a payment failed), or a **person** (a button in a
dashboard, a Slack command). Actions are anything with an effect: sending a message, writing a
row, moving a file, calling an API.

Written as code, the four parts become four small functions:

```python
from datetime import datetime, timedelta, UTC

def trigger_times(start, hours):
    """The schedule: one run per hour."""
    return [start + timedelta(hours=h) for h in range(hours)]

def load_context(now):
    """What the job needs to know (a database query in real life)."""
    return [
        {"id": 1, "patient": "Amira", "starts": now + timedelta(hours=20)},
        {"id": 2, "patient": "Tom", "starts": now + timedelta(hours=40)},
    ]

def decide(appointment, now):
    """Remind appointments that start in the next 24 hours."""
    return appointment["starts"] - now <= timedelta(hours=24)

def act(appointment):
    print(f"SMS to {appointment['patient']}: see you tomorrow")

now = datetime(2026, 3, 9, 8, 0, tzinfo=UTC)
for run_at in trigger_times(now, 1):
    for appointment in load_context(run_at):
        if decide(appointment, run_at):
            act(appointment)
```

When a client describes a process, listen for the four parts. "When a lead fills in the form"
is a trigger. "Look them up in the CRM" is context. "If they're an existing customer, send it to
their account manager" is a decision. "Post it in Slack" is an action. What they leave out is
usually the part that breaks: what happens to the lead with no company name?

```quiz
question: "An agency says: 'Every Monday, pull last week's ad spend from each client's account, and email the client a summary if spend went over budget.' Which part is 'if spend went over budget'?"
options:
  - The trigger
  - The context
  - The decision
  - The action
answer: 2
explain: "Every Monday is the trigger, last week's ad spend is the context, over budget or not is the decision, and the email is the action."
```

## Keep the decision pure

The decision is where the business rules live, and it's the part the client will want to change:
"make it 48 hours for new patients". So write it as a **pure function**: it takes the context and
the current time, and returns a list of actions to take, without taking any of them.

```python
from datetime import datetime, timedelta, UTC

def plan(appointments, now):
    actions = []
    for appt in appointments:
        if appt["status"] == "booked" and now < appt["starts"] <= now + timedelta(hours=24):
            actions.append({"send": "sms", "appointment": appt["id"]})
    return actions

now = datetime(2026, 3, 9, 8, 0, tzinfo=UTC)
appointments = [
    {"id": 7, "status": "booked", "starts": now + timedelta(hours=3)},
    {"id": 8, "status": "cancelled", "starts": now + timedelta(hours=5)},
]
plan(appointments, now)
```

Three things fall out of that shape for free:

- **Tests**: `plan()` takes `now` as an argument, so a test can ask what happens at 23:59 on the
  last day of the month without waiting for it.
- **Dry runs**: print the plan instead of executing it. Every automation you hand over should have
  a dry-run mode, because the first thing a nervous client asks is "what would it have done?"
- **Audit**: the list of actions is exactly what to log.

> [!TIP]
> Put `now` in the signature of anything that looks at the clock. Calling `datetime.now()` deep
> inside a decision makes it untestable, and you'll meet this rule in every lesson of this module.

## What's worth automating

A process is worth automating when three numbers multiply to something large:

- **Frequency**: how often it happens. Daily beats yearly.
- **Time**: how long it takes a person each time.
- **Error cost**: what a mistake costs, times how often people make one.

The first two give you hours saved. The third is often the bigger number, and the one clients
forget. A missed reminder is a £60 empty slot; a mistyped invoice amount is a refund, an apology
and a slightly less loyal customer.

```python
runs_per_month = 400          # reminder calls
minutes_per_run = 3
hourly_rate = 18              # the receptionist's cost to the clinic, in £
error_rate = 0.02             # calls forgotten or missed
cost_per_error = 60           # an empty slot

time_value = runs_per_month * minutes_per_run / 60 * hourly_rate
error_value = runs_per_month * error_rate * cost_per_error
time_value, error_value
```

£360 a month of the receptionist's time, and £480 a month of avoided no-shows. The error cost
more than doubles the case for building it.

```quiz
question: Which of these is the best candidate to automate first?
options:
  - "Renewing the company's domain names: once a year, 20 minutes, and an outage if it's forgotten"
  - "Copying web-form leads into the CRM: 30 a day, 4 minutes each, and a lost sale when one is mistyped"
  - "Writing the quarterly board report: 4 times a year, 2 days each, and it needs judgment throughout"
answer: 1
explain: "Leads score high on all three factors: frequent, repetitive, and costly when wrong. The domain renewal is better solved with auto-renew and a calendar reminder, and the board report is mostly judgment, which is the hardest part to automate."
```

## ROI on the back of an envelope

Clients don't buy hours saved; they buy **payback**: how many months until the automation has paid
for itself. You need three more numbers: what you'll charge to build it, what it costs to run each
month (hosting, SMS fees, API plans, your maintenance retainer), and the monthly saving from the
last section.

```python
monthly_saving = 360 + 480            # time value + error value
running_cost = 40                     # SMS credits and a small server
build_cost = 2400                     # your quote

net_per_month = monthly_saving - running_cost
payback_months = build_cost / net_per_month
round(payback_months, 1)
```

Three months is an easy yes. As a rough guide, under six months sells itself, six to twelve needs
a conversation, and over eighteen usually means the process is too rare, too cheap, or not ready.
If the running cost is higher than the saving, it never pays back, however cheap the build.

> [!WARNING]
> Keep the estimate honest. Count the client's time for testing and training, and assume the
> first version will need a round of fixes. An inflated ROI wins one project and loses the next.

## When not to automate

Some processes score well on paper and still shouldn't be automated yet:

- **The process isn't stable.** If the steps change every month, you'll be rebuilding, not
  maintaining. Write down the process first; automate it once it stops moving.
- **It's mostly judgment.** "Decide which complaints deserve a refund" needs rules someone can
  write down. (A2 onwards adds language models to the decision step, and even then a person
  signs off on the unusual cases.)
- **Nobody owns it.** Every automation needs a person who notices when it stops. If no one would
  miss it for a week, ask whether it's needed at all.

The usual answer isn't "all or nothing". Automate the common case and send exceptions to a
person: reminders go out automatically, and patients with no phone and no email land in a short
list on the receptionist's screen.

```quiz
question: "A shop's refund process: 80% are standard 'item not received' refunds under £50, and the rest are disputes that need a person to read the messages. What's the sensible design?"
options:
  - Don't automate it; any refund could be a dispute
  - Automate all of it, and let the rules decide the disputes too
  - Automate the standard refunds, and route everything else to a person's queue
answer: 2
explain: "Automate the common, rule-shaped case and route the exceptions. The decision function returns 'refund' or 'needs review', and the second kind becomes a task for a person."
```

## Where this leaves you

Every automation is a trigger, context, a decision and an action. Keep the decision pure, with
`now` passed in, so it can be tested and dry-run. Rank candidates by frequency × time × error
cost, and sell them on payback months. The drills build the calculator you'll use for quotes, and
the clinic's reminder planner. A8 returns to ROI when you write proposals; the rest of this module
is the toolkit for the trigger and action parts.
