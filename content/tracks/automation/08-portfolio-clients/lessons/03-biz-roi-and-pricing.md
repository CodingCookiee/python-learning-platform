---
slug: biz-roi-and-pricing
title: Estimating ROI and pricing
summary: Value the work three ways, show payback and first-year return, choose between hourly, fixed, value-based and retainer pricing, pass AI costs through at a margin, and quote a range with its assumptions.
minutes: 50
exercises:
  - biz-predict-margin
  - biz-roi-summary
  - biz-quote-price
  - biz-fix-ai-passthrough
  - biz-quote-range
---

After the discovery call you have a process, its numbers, and a client who wants to know two
things: what it's worth, and what it costs. The first is a calculation you do for them. The second
is a decision you make for yourself, and it's the one most developers get wrong, usually by
charging for the hours they typed instead of the problem they solved. This lesson covers both, and
the drills build the calculators you'll paste into every proposal.

> [!WARNING]
> Every rate, price and saving in this lesson and its drills is an **example**, invented to make the
> arithmetic easy to follow. Rates vary enormously between markets, niches and levels of
> experience. The method carries over; the numbers don't. Work out your own, in your own currency.

## Three kinds of value

A1 counted two kinds of value: **time saved** (hours × what those hours cost the client) and
**errors avoided** (mistakes × what each one costs). Proposals often have a third:

- **Revenue enabled.** Enquiries answered in two minutes instead of the next morning, abandoned
  baskets followed up, quotes sent the same day. Revenue is the biggest number and the easiest to
  exaggerate, so only count it when the client's own figures support it: their conversion rate,
  their average order, their lost-lead count.

```python
from decimal import Decimal

# EXAMPLE: an online shop's order-status emails, from the owner's own numbers
hours_saved = Decimal(26) * 18                 # 26 hours a month at 18 an hour
errors_avoided = Decimal(8) * 35               # wrong-order refunds that won't happen
revenue_enabled = Decimal(5) * 60              # repeat orders from customers who'd have left
{"time": hours_saved, "errors": errors_avoided, "revenue": revenue_enabled,
 "total": hours_saved + errors_avoided + revenue_enabled}
```

Present the three separately. A client who doubts your revenue figure should still see that the
time and errors pay for the project on their own, and if they don't, say so.

```quiz
question: "The shop's owner says, 'This will probably double our repeat orders.' What do you put in the ROI estimate?"
options:
  - "Double the repeat-order revenue: it's the owner's own estimate"
  - "A small, stated increase you can check afterwards, or nothing, with the owner's hope noted as upside"
  - "Nothing about revenue: only time counts"
answer: 1
explain: "Use a conservative number that you can measure after launch, and say where it came from. Hopes make good upside notes, and poor estimates."
```

## Payback and the first year

Payback, from A1, is the build price divided by the monthly net saving (benefit minus running
costs). Proposals add the **first-year return**: what the client ends up with after twelve months,
as a percentage of what they paid.

```python
from decimal import Decimal

build_price = Decimal("4200")
monthly_net = Decimal("1400")          # benefit minus hosting, AI usage and your retainer

payback = build_price / monthly_net
first_year_roi = (monthly_net * 12 - build_price) / build_price * 100
payback, first_year_roi
```

Show a **conservative** case alongside the expected one: the same sum with the revenue left out
and the time savings halved. If the conservative case still pays back within the year, the
decision is easy for the client, and you've shown that you aren't selling them a fantasy.

## Four ways to charge

| Model | You're paid for | Fits | The risk sits with |
|-------|-----------------|------|--------------------|
| **Hourly** (or daily) | time | unclear scope, audits, paid discovery, small changes | the client: slow work costs them more |
| **Fixed price** | a defined deliverable | a clear scope with acceptance criteria | you: overruns come out of your margin |
| **Value-based** | the outcome | measurable value and a client who trusts your numbers | shared, and it pays best when you're good |
| **Retainer** | availability and upkeep, monthly | anything in production: monitoring, fixes, model updates | balanced, if the scope is written down |

Most automation work ends up as **fixed price for the build plus a retainer for running it**.
Hourly pricing punishes you for getting faster, which you will, especially in a niche. Value-based
pricing, a share of the first-year value, is where experienced freelancers end up, but it needs
good discovery and numbers the client believes, which is why the first two lessons came first.

```quiz
question: "A logistics firm wants 'something to help with exceptions' but can't yet say which systems it uses or how many exceptions it gets. Which pricing fits the first piece of work?"
options:
  - A fixed price for the whole build
  - A value-based price, as a share of the savings
  - A paid discovery, priced by the day or fixed, to map the process and scope the build
answer: 2
explain: "You can't fix a price, or a share of value, for something nobody has defined. Sell the definition first. Its output is the scope that makes a fixed price safe."
```

## Build the price up from your costs

Whatever model you choose, know your floor: the hourly rate below which the work loses you money.
It comes from what you need to earn in a year, plus your costs, divided by the hours you can
actually bill. Freelancers often bill only half to two-thirds of their working hours, because
sales, admin and learning take the rest.

```python
from decimal import Decimal

target_income = Decimal("60000")      # EXAMPLE, per year, before tax
yearly_costs = Decimal("6000")        # software, hardware, accountant, insurance
billable_hours = 46 * 25              # 46 working weeks, 25 billable hours each

floor_rate = (target_income + yearly_costs) / billable_hours
floor_rate.quantize(Decimal("0.01"))
```

A fixed price is then your hours estimate × your rate, plus a **risk buffer** for what you can't
see yet (15 to 30% is common, more for unfamiliar systems or unclear data), rounded up to a clean
number. The buffer isn't padding. It's the price of carrying the risk that a fixed price moves
onto you.

## AI costs are passed through, with a margin

An AI automation has running costs that grow with use: model calls, embeddings, hosting, SMS. There
are two honest ways to handle them:

1. **The client pays the provider directly**, on their own account, with their own key. This is
   cleanest for large volumes: no risk to you, and the client owns the relationship.
2. **You pay and pass the cost through**, at cost plus a margin that covers your risk and admin
   (a surprise bill, a card that expires, a price change). Estimate it from A2's cost tracking, put
   the estimate in the proposal, and agree a monthly cap above which you'll ask before spending.

"Plus 20%" is ambiguous, and the difference is real money on a year of invoices:

```python
from decimal import Decimal

cost = Decimal("36.00")        # EXAMPLE: a month of AI usage
cost * Decimal("1.2"), (cost / Decimal("0.8")).quantize(Decimal("0.01"))
```

A 20% **markup** adds a fifth of the cost. A 20% **margin** means a fifth of the price is yours, so
the price is the cost divided by 0.8. Say which you mean in the contract, then check your
invoice code does the same. That's the fix drill.

> [!WARNING]
> Put a line in every proposal saying that AI and API usage is billed as used, with the estimate and
> the cap. Provider prices change, and usage grows when an automation works. Neither should come out
> of your pocket.

## Quote a range, and write down the assumptions

Before the scope is written, give a range rather than a single number, and list what it assumes:
"4,000 to 6,500, assuming API access to both ad accounts, and that an account manager reviews each
AI summary before it's sent." Assumptions are how you protect a fixed price. If one turns out to
be false, the price changes, and everyone agreed to that in advance.

Build the range from per-task estimates, with a low and a high for each. A task whose high is
twice its low or more is where your uncertainty lives, so ask about it before you fix the price.
Then check the high end against the first-year value: if the most it could cost is more than half
of what it saves in a year, expect a hard conversation.

```python
tasks = [("Connect ad platforms", 8, 16), ("Build the report", 12, 18), ("AI summaries", 6, 14)]
[name for name, low, high in tasks if high >= 2 * low]
```

```quiz
question: "Your range is 4,000 to 6,500. The client says, 'Great, so about 4,000?' What do you say?"
options:
  - "Yes, roughly"
  - "It'll be 4,000 if the assumptions hold and the uncertain tasks come in low. The fixed price will be in the proposal, once we've checked the ad-account access."
  - "Probably 6,500, to be safe"
answer: 1
explain: "Clients remember the bottom of a range. Tie each end to its assumptions, and say when you'll replace the range with a fixed price."
```

## Where this leaves you

Value the work as time, errors and revenue, show payback and first-year return with a
conservative case, and pick the pricing model that puts the risk where it belongs. Build fixed
prices from your floor rate with a risk buffer, pass AI costs through at a stated margin or have the
client pay the provider directly, and quote ranges with their assumptions until the scope is
settled. Settling the scope is the next lesson.
