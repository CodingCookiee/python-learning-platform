---
slug: prod-golden-sets
title: Golden datasets and scorers
summary: Replace "it looked fine" with a file of real cases, scorers that check each answer, and a pass rate you can compare from one change to the next.
minutes: 45
exercises:
  - prod-load-golden-set
  - prod-predict-scorers
  - prod-scorers
  - prod-schema-scorer
  - prod-run-eval
---

The support bot you built for a client goes live on Monday. On Friday afternoon someone asks for
one small change to the system prompt, "be a bit warmer", and you try it on four questions and it
looks fine. On Tuesday the bot starts telling customers that refunds take 30 days instead of 14.
Nobody tested the refund question after the change, because nobody had a list of questions to test.

An **eval** is that list, plus a way to check each answer automatically. It's a test suite for a
system that doesn't give the same output twice: fixed inputs, a definition of a good answer for
each, and a pass rate that tells you whether a change made things better or worse. This lesson
builds the first half, a golden dataset and the scorers that check it. The next lesson adds model
judges and puts the suite in CI.

## Why "it looked fine" isn't a test

A model's output varies with the prompt, the model version, the temperature and the input, and a
change that fixes one answer can quietly break three others. Reading a handful of outputs catches
the obvious failures and none of the subtle ones. What catches them is the same thing that catches
regressions in ordinary code: the same cases, every time, scored the same way.

```python
cases = [
    {"question": "How long do refunds take?", "must_mention": "14 days"},
    {"question": "Do you ship to Ireland?", "must_mention": "Ireland"},
    {"question": "Can I change my delivery address?", "must_mention": "before dispatch"},
]
answers_before = ["Refunds reach you within 14 days.", "Yes, we ship to Ireland.", "You can, before dispatch."]
answers_after = ["Refunds take up to 30 days.", "Yes! We ship to Ireland.", "Sure, before dispatch."]


def pass_rate(answers):
    passed = [case["must_mention"] in answer for case, answer in zip(cases, answers)]
    return sum(passed) / len(passed)


pass_rate(answers_before), pass_rate(answers_after)
```

Two thirds sounds fine until you notice which third broke. A pass rate on its own tells you
something changed; the per-case results tell you what. You'll keep both.

## Golden datasets in JSONL

A **golden dataset** is a file of cases with known good answers. Store it as **JSONL**: one JSON
object per line. Each case is independent, so a new case is one appended line, a diff shows exactly
which cases changed, and a 50,000-case file can be read one line at a time.

```text
{"id": "refund-window", "input": "How long do refunds take?", "expected": ["14 days"], "scorer": "contains", "tags": ["refunds"]}
{"id": "ship-ireland", "input": "Do you ship to Ireland?", "expected": ["yes", "Ireland"], "scorer": "contains", "tags": ["shipping"]}
{"id": "order-lookup", "input": "Where is order 1042?", "expected": "1042", "scorer": "contains", "tags": ["orders"]}
```

Give every case a stable `id`, so results can be compared across runs even when the file is
reordered, and `tags`, so you can see that the bot is fine on shipping and bad at refunds. Reading it
is a loop over lines:

```python
import json

GOLDEN = """{"id": "refund-window", "input": "How long do refunds take?", "expected": ["14 days"], "scorer": "contains"}

{"id": "order-lookup", "input": "Where is order 1042?", "expected": "1042", "scorer": "contains"}
"""

cases = [json.loads(line) for line in GOLDEN.splitlines() if line.strip()]
[case["id"] for case in cases]
```

Where do cases come from? In order of value:

1. **Real inputs**, from logs or the client's inbox, redacted (lesson 3). They're what the system
   will actually see.
2. **Every bug report.** When the bot gets something wrong in production, the input becomes a case
   before the fix goes in, exactly as you'd add a regression test.
3. **Edge cases** you can think of: empty input, another language, an order number that doesn't
   exist, a question the documents don't answer.
4. **Attacks**: prompt injections and attempts to get secrets out (lesson 6).

Start with 20 to 50 cases. That's enough to catch regressions, and small enough to run on every
change.

> [!WARNING]
> Never paste golden cases into the prompt as few-shot examples. The system then scores well on
> exactly those cases because it has seen the answers, and the eval stops measuring anything.
> Keep a separate set of examples for prompts, and keep the eval set out of them.

## Deterministic scorers

A **scorer** takes an output and the case's expectation and says pass or fail. Reach for the
simplest one that can tell a good answer from a bad one. They're instant, free and never disagree
with themselves, unlike a model judge.

| Scorer | Passes when | Good for |
|--------|-------------|----------|
| exact | the output equals the expected text, after normalising case and spaces | labels, categories, yes/no |
| contains | every required phrase appears | facts an answer must state |
| regex | a pattern matches | formats: order ids, dates, "no URL at all" |
| schema | the output is valid JSON for a model, with the right values | extraction |
| numeric | the number in the output is within a tolerance | totals, amounts, counts |

The wrong way first: raw equality fails good answers for reasons nobody cares about.

```python
expected = "billing"
outputs = ["billing", "Billing", "billing\n", " billing."]
[output == expected for output in outputs]
```

Normalise before comparing: strip the ends, fold the case, collapse runs of whitespace, and drop
trailing punctuation the model likes to add.

```python
import re


def normalise(text):
    return re.sub(r"\s+", " ", text).strip().strip(".!").casefold()


expected = "billing"
outputs = ["billing", "Billing", "billing\n", " billing."]
[normalise(output) == normalise(expected) for output in outputs]
```

Numbers need a tolerance, because "1,240.50", "1240.5" and "€1,240.50" are the same total, and
because some tasks (an estimated delivery in days, a sentiment score) are right within a margin.
Pull out the first number, drop thousands separators, and compare with `abs(a - b) <= tolerance`:

```python
import re


def first_number(text):
    match = re.search(r"-?\d[\d,]*(?:\.\d+)?", text)
    return float(match.group().replace(",", "")) if match else None


[first_number(reply) for reply in ["The total is €1,240.50.", "1240.5", "No total found"]]
```

```quiz
question: The invoice extractor's eval checks that the total is "within 0.01". Which output fails?
options:
  - "Total: 1,240.50 EUR"
  - "1240.5"
  - "EUR 1240.50 in total"
  - "Subtotal 1,200.00, total 1,240.50"
answer: 3
explain: "The scorer takes the first number, and the first number in that reply is the subtotal, 1200.00. Either ask the model for the total alone, or use a structured output with a total field. Free text makes scoring fragile too."
```

## Structured outputs: score against the schema

When the output is JSON, as it is for the invoice extractor from A3, the Pydantic model you
already have is the schema. A case passes when the output parses, validates, and has the expected
value in each field the case cares about. Validation failures are the most useful kind of failure,
because they name the field.

```python
import json
from decimal import Decimal

from pydantic import BaseModel, ValidationError


class Invoice(BaseModel):
    invoice_number: str
    vendor: str
    total: Decimal


def score_invoice(output, expected):
    try:
        invoice = Invoice.model_validate(json.loads(output))
    except (ValueError, ValidationError) as error:
        return False, f"invalid: {str(error).splitlines()[0]}"
    wrong = [f for f, value in expected.items() if getattr(invoice, f) != value]
    return not wrong, f"wrong {', '.join(wrong)}" if wrong else "ok"


expected = {"invoice_number": "INV-2291", "total": Decimal("1240.50")}
[
    score_invoice('{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "total": "1240.50"}', expected),
    score_invoice('{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "total": "1204.50"}', expected),
    score_invoice('{"invoice_number": "INV-2291", "total": "1240.50"}', expected),
]
```

Return a reason with every score, not only `True` or `False`. When 12 cases fail after a prompt
change, "wrong total" on eight of them tells you where to look.

> [!TIP]
> `ValueError` covers `json.JSONDecodeError` too, which is a subclass of it. Pydantic's
> `ValidationError` is also a `ValueError` subclass, but naming it keeps the intent clear.

## Running an eval

An eval run is a loop: for each case, call the system, score the output, and record everything.
Three rules make it trustworthy:

- **An exception is a failed case, not a crashed run.** If case 31 of 50 raises, you still want
  the other 49 results, and the error for case 31.
- **Record the output with the score.** You'll read failing outputs far more often than passing ones.
- **Report by tag as well as overall.** An overall 90% can hide 40% on refunds.

```python
from collections import defaultdict


def contains(output, expected):
    return all(phrase.casefold() in output.casefold() for phrase in expected)


def support_bot(question):
    if "Ireland" in question:
        raise TimeoutError("model took too long")
    return "Refunds reach your card within 14 days."


cases = [
    {"id": "refund-window", "input": "How long do refunds take?", "expected": ["14 days"], "tags": ["refunds"]},
    {"id": "ship-ireland", "input": "Do you ship to Ireland?", "expected": ["Ireland"], "tags": ["shipping"]},
]
results, by_tag = [], defaultdict(list)
for case in cases:
    try:
        output, error = support_bot(case["input"]), None
    except Exception as exc:
        output, error = None, f"{type(exc).__name__}: {exc}"
    passed = error is None and contains(output, case["expected"])
    results.append((case["id"], passed, error))
    for tag in case["tags"]:
        by_tag[tag].append(passed)
results, {tag: sum(v) / len(v) for tag, v in by_tag.items()}
```

Run the eval with `temperature=0` where your provider allows it, so reruns are as close to repeatable
as a model gets. Even then, outputs can drift slightly between runs. That's why the next lesson
gates on a pass-rate threshold rather than on every single case.

## Where this leaves you

An eval is a golden dataset (JSONL, one case per line, with ids and tags, grown from real inputs
and every bug) and scorers that decide each case: normalised exact match, contains, regex, schema
validation with field checks, and numbers within a tolerance. Every score carries a reason, an
exception fails one case rather than the run, and results are reported overall and by tag. The drills
load a golden file and reject bad lines, predict what four scorers decide, write the scorers, score
extraction output against a schema, and build the eval runner the rest of the module uses.
