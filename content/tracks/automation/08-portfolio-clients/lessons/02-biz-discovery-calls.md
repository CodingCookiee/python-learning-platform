---
slug: biz-discovery-calls
title: Discovery calls
summary: Run a 30-minute call with a plan, ask questions that find the process and the money, qualify the client on budget, authority, need and timeline, notice red flags, and rehearse it all with an AI role-play.
minutes: 45
exercises:
  - biz-call-agenda
  - biz-fix-red-flags
  - biz-pick-questions
  - biz-qualify-lead
  - biz-roleplay-client
---

The practice manager from the last lesson has agreed to a 30-minute video call. You have two jobs
in that half hour, and most people starting out only do the first: understand the process well
enough to quote for it, and decide whether this is a client you want. A good discovery call feels
like a conversation to the client, but you ran it from a plan. This lesson gives you the plan,
the questions, the qualifying checks and the red flags, and a way to practise before a real
client is on the other end.

## The shape of the call

Thirty minutes goes quickly. Agree the time in advance, send a short agenda with the invitation,
and ask at the start whether you can take notes. Then keep roughly to this:

| Part | Minutes | What you're after |
|------|---------|-------------------|
| Introductions | 3 | who's on the call, and what made them reach out now |
| Their business | 7 | what they sell, to whom, how many people, which systems |
| The process | 12 | one process in detail: the map from the last lesson, with numbers |
| Success and constraints | 5 | what "working" looks like, budget, deadline, who decides |
| Next steps | 3 | what you'll send, by when, and what you need from them |

```python
from datetime import datetime, timedelta

sections = [("Introductions", 3), ("Their business", 7), ("The process", 12),
            ("Success and constraints", 5), ("Next steps", 3)]
clock = datetime(2026, 10, 6, 14, 0)
for title, minutes in sections:
    print(f"{clock:%H:%M} {title}")
    clock += timedelta(minutes=minutes)
print(f"{clock:%H:%M} end")
```

The client should do about 70% of the talking. If you notice you've been explaining for more than
a minute, you've started pitching, and pitching comes later, in the proposal.

> [!TIP]
> Always leave the last three minutes for next steps, even if the process section overruns. A good
> call that ends with "I'll be in touch" loses to an average one that ends with "You'll have a
> proposal by Thursday, and I need a sample export from you by Tuesday."

## Questions that find the money

The questions from the last lesson find processes. In the call, you need questions that also find
**value**, and the best ones are open, specific and about the past:

- **"Tell me about the last time that went wrong."** A real story gives you the error cost and the
  emotion. "Sometimes we miss one" gives you neither.
- **"How many, how long, how often?"** Ask for yesterday's or last week's numbers, not an average.
- **"What happens if nothing changes for another year?"** If the answer is "not much", the
  project isn't urgent, whatever they say.
- **"What have you already tried?"** You'll hear about the tool they bought and abandoned, which
  tells you what not to propose.
- **"What would make you say this was worth it, six months from now?"** This is where the
  acceptance criteria for your proposal come from.

Keep a bank of questions tagged by topic, pick from it before each call, and skip what you already
know. That's the third drill. Silence is also a question: after an answer, wait two seconds. People
fill the gap with the detail you needed.

```quiz
question: "Twenty minutes in, the practice manager asks, 'So could AI just handle all our patient communication?' What's the best response?"
options:
  - "Yes. Explain how a language model could answer patients' messages."
  - "Possibly. Which part of it takes the most time today, and what goes wrong with it?"
  - "No, AI isn't reliable enough for healthcare."
answer: 1
explain: "Neither a promise nor a refusal: bring the conversation back to a specific process and its numbers. You can't know yet what's possible, and a promise made on a discovery call becomes an expectation in the contract."
```

## Qualify the client, not only the project

Four questions tell you whether a project can actually happen. They're often abbreviated **BANT**:

| | Ask | You're checking |
|---|---|---|
| **Budget** | "Projects like this usually come to between X and Y. Is that in the range you had in mind?" | there's money, and roughly how much |
| **Authority** | "Who else will be involved in deciding on this?" | you're talking to someone who can say yes |
| **Need** | the numbers from the process section | the problem is worth more than the fix |
| **Timeline** | "When would you like this working, and what happens on that date?" | there's a reason to start now |

Asking about budget feels awkward the first time. Giving a range first makes it easier for both
sides, and a client who flinches at the range has saved you writing a proposal. Anything you
didn't find out is a question for the follow-up email, not an assumption to fill in.

```python
from decimal import Decimal

notes = {"budget": Decimal("6000"), "decision_maker": True,
         "monthly_pain": Decimal("900"), "start_within_days": None}   # EXAMPLE notes
min_budget = Decimal("5000")

{
    "budget": notes["budget"] is not None and notes["budget"] >= min_budget,
    "authority": notes["decision_maker"] is True,
    "need": notes["monthly_pain"] is not None and notes["monthly_pain"] * 12 >= min_budget,
    "timeline": notes["start_within_days"] is not None and notes["start_within_days"] <= 90,
}
```

Notice that `None` never passes. An unknown timeline isn't a "no", but it isn't a "yes" either,
and the drill turns it into a question to send.

## Red flags, and when to walk away

Some things said on a first call predict a painful project. None of them is automatically a no,
but each one needs a direct question before you write a proposal:

- **"Can you build a quick prototype first, so we can see?"** Unpaid spec work. Offer a small paid
  pilot instead.
- **"We can offer equity instead."** Unless you're choosing to invest, it means there's no budget.
- **"It should be simple."** The client has already priced it in their head, low.
- **"We can't give you access to the real data yet."** You can't estimate, test or accept
  anything without it.
- **The decision-maker is never on the call.** You'll be re-pitching to someone who wasn't there.
- **"We need it to be 100% accurate."** No AI system is. Explain measured accuracy and human review
  now, or the project fails at acceptance.
- **The goal itself is the problem**: fake reviews, messages to people who never agreed to them,
  scraping personal data. Say no, politely, and don't negotiate.

Writing these down after each call is where a small tool helps, and where a careless one lies to
you:

```python
"free" in "Their last freelancer left."
```

`True`: a substring isn't a word. The fix drill makes the detector trustworthy.

## Rehearse it before it counts

The first few discovery calls are nerve-racking, and you only get one first call with each client.
Rehearse. You have two partners for that on this platform.

**The tutor.** Open any drill in this lesson and ask the tutor in the editor pane to play a client:
"Play the practice manager of a three-dentist clinic. Reception spends every morning on reminder
calls. Your budget is a few thousand. Only mention that the dentists refused the last new system if
I ask what worries you. Answer briefly, and stay in character until I say 'end of call', then tell
me what I missed." Run your agenda against it and time yourself.

**Your own key.** Once the stretch drill works, run the same role-play on your machine through
your A2 client, with personas you write for the niches you're aiming at. The code is the drill's;
only the client changes:

```python norun
from llm import make_llm          # your A2 client; reads the key from your environment
from rehearse import rehearse     # your solution to the stretch drill

persona = {"role": "operations manager", "business": "a 40-truck logistics firm",
           "pain": "drivers' delivery exceptions arrive as 30 emails a day",
           "budget": "unsure, needs to ask the finance director",
           "hidden": "the finance director was burned by an agency last year"}
result = rehearse(make_llm(), persona, ["What does a normal morning look like?",
                                        "Who else will be involved in deciding on this?"])
print(result["feedback"])
```

The same thing runs here against a scripted fake, so you can see the shape of the conversation:

```python
from plp_fakes import ScriptedLLM

llm = ScriptedLLM(["About thirty a day, all by email.", "Our finance director. She's cautious."])
messages = []
for question in ["How many exceptions a day?", "Who else decides?"]:
    messages.append({"role": "user", "content": question})
    reply = llm.complete(messages, system="You are the operations manager...", temperature=0.7)
    messages.append({"role": "assistant", "content": reply.text})
[m["content"] for m in llm.calls[1]["messages"]]
```

> [!NOTE]
> A role-play client is more cooperative than a real one and never has a bad day. Use it to
> practise structure and questions, then do a practice call with a friend who runs a business,
> and ask them to be difficult.

## After the call

Within one working day, send a short follow-up: the process as you understood it, in their words;
the numbers they gave you; the questions still open (the unknowns from qualifying); and the next
step with a date. If the project is big or unclear, the next step can be a **paid discovery**: a
fixed-price day or two to map the process properly and scope the build, credited against the
project if they go ahead. It's how you get paid for the thinking that's otherwise given away in
proposals.

```quiz
question: "Qualifying shows budget and need, but the decision-maker is the owner, who wasn't on the call, and the timeline is unknown. What's the best next step?"
options:
  - Send a full proposal straight away while they're keen
  - "Send a follow-up with the two open questions, and ask for a short call with the owner"
  - Drop the lead, because it isn't qualified
answer: 1
explain: "Half-qualified isn't disqualified. Ask the open questions, and get the decision-maker into the conversation before you spend a day on a proposal they haven't asked for."
```

## Where this leaves you

Run the call from an agenda and keep the last three minutes for next steps. Ask about specific
past events and their numbers, qualify on budget, authority, need and timeline, and treat
unknowns as questions. Take red flags seriously, and practise with the tutor and then with your own
key. The drills build the agenda, the red-flag detector, the question picker, the qualifier and
the role-play. Next you'll turn what you learned on the call into an ROI estimate and a price.
