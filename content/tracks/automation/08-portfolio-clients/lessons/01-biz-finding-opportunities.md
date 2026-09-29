---
slug: biz-finding-opportunities
title: Finding automation opportunities
summary: Ask about the client's week rather than about AI, map what they describe, count it properly, and rank it by frequency, time, error cost and strategic value. Then look for the niche.
minutes: 40
exercises:
  - biz-predict-opportunity-score
  - biz-fix-monthly-runs
  - biz-map-gaps
  - biz-opportunity-matrix
  - biz-niche-shortlist
---

The owner of a three-dentist clinic tells you, "We should be using AI for something." A logistics
company's operations manager says, "Everything here is manual." Neither of them has told you what
to build, and neither of them knows yet. Finding that out is your first piece of paid work, and
often the most valuable one. This lesson turns it into a method: questions that surface real
processes, a map that shows what's missing, numbers you can defend, and a ranking. The drills
build the tools you'll bring to every first meeting.

## Ask about the week, not about AI

"What would you like to automate?" is the weakest question you can ask. Most clients don't know
what's possible, so they either say "nothing" or describe a science-fiction project. Ask instead
about the work they already do. People remember the specifics of last Tuesday much better than
they can describe their processes in general.

Questions that find processes:

- **"Walk me through yesterday. What did you do first?"** Repetitive work shows up in the first
  hour of the day.
- **"What do you copy from one system into another?"** Retyping is the most common automation there
  is: form to CRM, email to spreadsheet, spreadsheet to invoice.
- **"Where does work wait for someone?"** Queues and inboxes that pile up are triggers waiting to
  happen.
- **"When did something last go wrong, and what did it cost?"** This is where the error cost
  comes from, and it's often bigger than the time.
- **"If you had ten more hours a week, what would you do with them?"** This is where the strategic
  value comes from.

Then quantify each answer as you go: how often, how long, how many people, and what a mistake
costs. You'll get estimates, not facts. Write down who gave you each number, so you can check it
later.

```quiz
question: "The clinic's practice manager says 'reminders take ages'. What's the best next question?"
options:
  - "Would you like an AI assistant to send them?"
  - "How many reminders did you send yesterday, how, and how long did it take?"
  - "Have you tried a reminder app?"
answer: 1
explain: "Pin the process to a specific day and get numbers: how many, which channel, how long. Proposing a solution before you understand the process is how you end up building the wrong thing."
```

## Map what they tell you

In A1 you took automations apart into a **trigger**, some **context**, a **decision** and an
**action**. Use the same four parts to take notes during a call, and add the two things clients
nearly always leave out: what happens when none of the rules fit (the **fallback**), and who looks
after it (the **owner**). The gaps in the map are your questions for the next call.

```python
recalls = {
    "trigger": "A patient is due a six-month check-up",
    "context": {"last visit": "practice software", "phone": "practice software"},
    "decisions": [
        {"rule": "Text them if they allow SMS", "uses": ["sms consent", "phone"]},
        {"rule": "Otherwise post a letter", "uses": ["address"]},
    ],
    "actions": ["Send the text or letter", "Note it on the patient record"],
}

for part in ["trigger", "volume", "context", "decisions", "fallback", "actions", "owner"]:
    if not recalls.get(part):
        print("missing:", part)

needed = {field for rule in recalls["decisions"] for field in rule["uses"]}
needed - recalls["context"].keys()
```

Two questions fall out immediately: where does SMS consent come from, and where are the addresses?
If the answer is "Sarah knows", the automation isn't ready to build yet: first the information has
to live somewhere a program can read it. That finding is worth writing into your proposal, because
it's work the client has to do before your build can start.

> [!TIP]
> Send the map back to the client after the call, as a short list of steps. They'll correct it,
> and every correction they make now is a change request you won't have to make later.

## Count it in months

Every estimate you make later is per month, but clients describe frequency however it comes to
mind: "thirty a day", "three times a week", "every quarter". Convert carefully, because the easy
shortcuts are wrong in the direction that flatters your ROI:

| They say | Per month | The shortcut | Its error |
|----------|-----------|--------------|-----------|
| per week | 52 / 12 ≈ 4.33 | 4 | 8% too low |
| per working day | 5 × 52 / 12 ≈ 21.7 | 30 | 38% too high |
| per day (every day) | 365 / 12 ≈ 30.4 | 30 | about right |

```python
from decimal import Decimal

per_working_day = Decimal(5 * 52) / 12
emails_per_day = 30          # EXAMPLE: delivery exception emails at a logistics firm
(emails_per_day * per_working_day).quantize(Decimal("0.1"))
```

Then subtract what doesn't happen: public holidays, the quiet month, the days the process is
skipped. It's better to underestimate volume and be pleasantly surprised than the other way round.

## Score it on four numbers

A1 ranked processes on three numbers: **frequency**, **time** per run, and **error cost**. The first
two give you hours saved; the third is often the bigger number. For client work, add a fourth:
**strategic value**, the things that matter to the owner but don't show up as hours. Replying to a
new-patient enquiry in two minutes instead of two hours wins bookings. A compliance check that is
never skipped avoids a fine that nobody wants to put a number on. A task the owner hates is worth
more to them than its hours.

Don't turn strategic value into invented money. Agree a simple weight with the client (low,
medium or high, as 1, 2 and 3) and multiply by it. Then set the result against **effort**, your
estimate in build days, to get four boxes:

| | Low effort | High effort |
|---|---|---|
| **High value** | quick wins: do these first | big bets: plan and phase them |
| **Low value** | fill-ins: do them when convenient | money pits: say no |

```python
from decimal import Decimal

WEIGHTS = {"low": 1, "medium": 2, "high": 3}
RATE = Decimal("20")   # EXAMPLE hourly cost of the person doing it now

def priority(runs, minutes, error_rate, cost_per_error, strategic):
    time_value = Decimal(runs) * minutes / 60 * RATE
    error_value = Decimal(runs) * error_rate * cost_per_error
    return (time_value + error_value) * WEIGHTS[strategic]

{
    "recall letters": priority(150, 4, Decimal("0"), 0, "low"),
    "new-patient enquiries": priority(30, 8, Decimal("0.1"), 120, "high"),
}
```

Recall letters save more hours, and new-patient enquiries still win by a wide margin: a missed
enquiry is a lost patient, and the owner cares about growth. This is why the error cost and the
strategic weight matter. Ranked by hours alone, you'd pitch the wrong project.

```quiz
question: "An ecommerce shop wants a custom AI that writes every product description from photos. It would take you 30 days to build, it would save about 4 hours a month, and the owner rates it 'nice to have'. Which box is it in?"
options:
  - A quick win
  - A big bet
  - A fill-in
  - A money pit
answer: 3
explain: "Low value (a few hours a month, low strategic weight) and high effort. Say so, and point the owner at the quick win you found instead. Clients remember the consultant who talked them out of a waste of money."
```

## Niches: the same problem again and again

After a few calls in one industry, you'll notice the same processes recurring. Every dental clinic
chases recalls and no-shows. Every online shop answers "where is my order?" emails. Every logistics
firm handles delivery exceptions, and every marketing agency builds monthly client reports by hand.
Each of those is a **niche**: one process, one kind of business, and many owners with the same
problem.

A niche changes the economics of your work. Discovery gets faster because you know the questions.
The second build reuses most of the first. Case studies speak the next client's language ("a
clinic like yours cut no-shows by…"), and owners in one industry talk to each other. It is also how
you move from custom projects to a **productised offer** with a fixed scope and price, which is
what the capstone asks you to write.

Choose a niche from evidence rather than from a list of hot markets: your own notes, an industry
you've worked in, a community you already belong to.

```python
from collections import Counter

# EXAMPLE notes from discovery calls: (industry, process)
notes = [
    ("dental", "recall reminders"), ("ecommerce", "order status emails"),
    ("dental", "recall reminders"), ("agency", "monthly reports"),
    ("ecommerce", "order status emails"), ("dental", "insurance claims"),
    ("dental", "recall reminders"), ("ecommerce", "order status emails"),
]
Counter(notes).most_common(2)
```

A count is a starting point, and the stretch drill makes it honest: one client mentioning a
process three times still counts once, and a niche needs value as well as frequency.

> [!NOTE]
> A niche is a focus, not a promise to turn everything else away. Most people start general, notice
> which projects went well and which clients referred others, and narrow from there.

## Where this leaves you

Ask about the week and quantify every answer. Map it into trigger, context, decision and action,
plus a fallback and an owner, and turn the gaps into questions. Convert frequencies to months
honestly, rank by frequency × time × error cost × strategic value against effort, and watch for
the problem that keeps repeating. The drills build the scorer, the gap finder and the niche
finder. The next lesson puts them into a structured discovery call, where you also find out
whether this client is one you want.
