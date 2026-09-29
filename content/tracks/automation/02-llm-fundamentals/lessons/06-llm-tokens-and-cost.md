---
slug: llm-tokens-and-cost
title: Tokens, cost and choosing a model
summary: Turn usage into money with a pricing table you pass in, track every call, enforce a budget, and pick the cheapest model that's good enough.
minutes: 45
exercises:
  - llm-fix-cost-mixup
  - llm-cost-tracker
  - llm-pick-model
  - llm-budget-guard
---

The first question a client asks about an AI automation is what it will cost to run, and the second
comes a month later when the invoice is bigger than you said. Both are answered by the same
numbers: the tokens each call used, which both APIs report on every response, and a price per token
for each model. This lesson turns those into a cost per call, a running total, a budget that stops
spending before it's exceeded, and a way to choose a model on evidence.

> [!WARNING]
> Every price in this lesson and its drills is an **example**, made up for practice. Real prices
> differ between models, change over time, and have discounts for cached and batched requests. Read
> the current numbers from each provider's pricing page into your own table.

## Usage is the bill

Providers charge separately for input and output tokens, quoted in dollars per **million** tokens,
and output tokens cost several times more than input tokens. The cost of one call is:

`input_tokens × input price / 1,000,000 + output_tokens × output price / 1,000,000`

Use `Decimal` for money, as in module 1: float rounding errors on thousands of tiny amounts add up to
a total that doesn't match the invoice.

```python
from dataclasses import dataclass
from decimal import Decimal

# EXAMPLE prices in USD per million tokens, invented for practice. Not real prices.
EXAMPLE_PRICES = {
    "model-small": {"input": Decimal("0.50"), "output": Decimal("2.00")},
    "model-medium": {"input": Decimal("2.50"), "output": Decimal("10.00")},
    "model-large": {"input": Decimal("12.00"), "output": Decimal("48.00")},
}


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


def call_cost(usage, price):
    return (usage.input_tokens * price["input"] + usage.output_tokens * price["output"]) / 1_000_000


summary_call = Usage(input_tokens=1_800, output_tokens=120)
{model: call_cost(summary_call, price) for model, price in EXAMPLE_PRICES.items()}
```

A fraction of a cent per ticket looks like nothing, until you multiply it. At 3,000 tickets a day
the gap between the small and large model is real money every month, which is why model choice is
a business decision, not only a technical one.

```python
from decimal import Decimal

per_ticket = {"model-small": Decimal("0.00114"), "model-large": Decimal("0.02736")}
{model: f"${cost * 3000 * 30:,.2f} a month" for model, cost in per_ticket.items()}
```

Pass the pricing table in as data (a dict, a JSON file, a settings object) rather than writing
prices into your logic. Prices change and you'll want to update them without touching code, and a
test can pass in a table with numbers that are easy to check.

## Track every call

Because every automation takes an `LLM`, you can add tracking without touching any of them: wrap
the client in another object with the same `complete()` method, which passes each call through and
records its usage. That's composition from module 5, and the wrapper satisfies the protocol, so
nothing downstream can tell the difference.

```python
from dataclasses import dataclass
from decimal import Decimal

EXAMPLE_PRICES = {"model-small": {"input": Decimal("0.50"), "output": Decimal("2.00")}}


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


@dataclass
class Reply:
    text: str
    usage: Usage
    model: str


class CannedLLM:
    model = "model-small"

    def complete(self, messages, **options):
        return Reply("Cracked screen on #1042.", Usage(1_800, 120), options.get("model") or self.model)


class UsageLog:
    def __init__(self, llm, prices):
        self._llm, self._prices = llm, prices
        self.calls = []

    def complete(self, messages, **options):
        response = self._llm.complete(messages, **options)
        price = self._prices[response.model]
        cost = (response.usage.input_tokens * price["input"] + response.usage.output_tokens * price["output"]) / 1_000_000
        self.calls.append((response.model, response.usage, cost))
        return response


llm = UsageLog(CannedLLM(), EXAMPLE_PRICES)
for ticket in ["Cracked screen", "Late delivery", "Wrong size"]:
    llm.complete([{"role": "user", "content": ticket}])
len(llm.calls), sum(cost for _, _, cost in llm.calls)
```

Record the model the **response** names, not the one you asked for: an alias can resolve to a
specific version, and that's the one you're billed for.

## Estimate before you send

Usage arrives after the call, which is too late to stop an expensive one. Before sending, you can
work out the **worst case**: the estimated input tokens (four characters each) plus `max_tokens`,
since the reply can't be longer than that. That's what a budget checks against:

```python
import math
from decimal import Decimal

price = {"input": Decimal("0.50"), "output": Decimal("2.00")}


def estimate_tokens(text):
    return math.ceil(len(text) / 4)


def worst_case_cost(messages, system, max_tokens, price):
    input_tokens = estimate_tokens(system or "") + sum(estimate_tokens(m["content"]) for m in messages)
    return (input_tokens * price["input"] + max_tokens * price["output"]) / 1_000_000


long_thread = [{"role": "user", "content": "Thread export. " * 2_000}]
worst_case_cost(long_thread, "Summarise this thread.", max_tokens=1_000, price=price)
```

A budget has to live somewhere that sees every call, which again means a wrapper. Agents (A5) make
this essential: a loop that decides for itself how many calls to make needs a hard cap it can't talk
its way past.

```quiz
question: A budget wrapper has $0.010 left. A call's worst case is $0.004 and its actual cost turns out to be $0.001. What should the wrapper do?
options:
  - Refuse the call, because the worst case is more than a third of what's left
  - Allow it, then subtract the actual $0.001 from what's left
  - Allow it, then subtract the worst-case $0.004
answer: 1
explain: "The worst case decides whether a call may start (it fits in $0.010), and the actual usage is what gets spent. Subtracting the worst case would make the budget run out early for no reason."
```

## Choosing a model

Every provider sells a range, from small, fast, cheap models to large, slower, more capable ones
(for Anthropic currently `claude-haiku-4-5`, `claude-sonnet-5` and `claude-opus-5-5`). The right one
depends on the task:

| Task | Usually good enough | Why |
|------|---------------------|-----|
| Classify a lead, route a ticket, extract fields | the smallest model | short outputs, narrow task, easy to check |
| Summarise, draft a reply | small or medium | quality shows in tone and accuracy; test both |
| Multi-step reasoning, long documents, agents | medium or large | smaller models skip steps or lose the thread |

Latency matters as much as cost: a Slack bot needs the first words in about a second, a nightly
batch job doesn't care. Measure two numbers: **time to first token** (what users feel, with
streaming) and **total time** (what a pipeline waits for).

The method is always the same, and it's what the capstone builds:

1. Collect 20–50 real inputs with known good answers: an **eval set**.
2. Write a scoring function: exact match for labels, "contains the order number" for summaries.
3. Run every candidate model on every input, recording score, latency and cost.
4. Pick the **cheapest model that meets your quality bar and latency limit**. Re-run it when a new
   model comes out, or when you change the prompt.

```python
from decimal import Decimal

results = [
    # model, share of eval cases passed, median latency (ms), cost per 1,000 tickets (EXAMPLE)
    ("model-small", 0.86, 420, Decimal("1.14")),
    ("model-medium", 0.95, 900, Decimal("5.70")),
    ("model-large", 0.97, 2_100, Decimal("27.36")),
]
good_enough = [r for r in results if r[1] >= 0.93 and r[2] <= 1_500]
min(good_enough, key=lambda r: r[3])[0]
```

The large model scores best, but the medium one meets the bar at a fifth of the cost and twice the
speed. Without the eval, you'd have guessed.

## Where this leaves you

Cost is input tokens times the input price plus output tokens times the output price, per million,
in `Decimal`, from a pricing table you pass in and keep up to date. A wrapper with the same
`complete()` records every call's usage and cost, and another refuses any call whose worst case
would break the budget. Choose models with an eval set: the cheapest one that meets your quality and
latency bars wins. The drills fix a calculator that mixed up its prices, build the tracker, pick a
model from eval results, and enforce a budget.
