---
slug: validate-and-repair
title: Validate with Pydantic, then repair
summary: JSON that parses isn't JSON that's right. Validate it against a model, and when it fails, send the errors back and let the model fix its own reply, a bounded number of times.
minutes: 40
exercises:
  - struct-validation-feedback
  - struct-invoice-model
  - struct-fix-endless-retry
  - struct-repair-loop
---

A bookkeeping client forwards supplier invoices to an inbox, and your automation turns each one into
a row in their accounting system. The model's reply parses as JSON every time. Then an invoice
arrives with the total as `"1.240,50"`, the currency as `"euro"` and no invoice number, and the
accounting API rejects the row at 2am. Parsing only proves the reply is JSON. This lesson makes sure
it's the JSON you asked for, and gives the model a chance to fix it when it isn't.

## Parsing isn't validating

Here's a reply that `extract_json` from the last lesson handles perfectly:

```python
import json

reply = '{"invoice_number": "", "vendor": "Kiln Supplies", "total": "1.240,50", "currency": "euro", "due_date": "next Friday"}'
invoice = json.loads(reply)

two_months = invoice["total"] * 2
two_months
```

No error, and a wrong answer: "twice the total" repeated the string. Every field is "there" and
none of them is usable. An empty invoice number, a total in
European notation, a currency the accounting system doesn't know and a date that's a phrase. You
need a check between "the model replied" and "the automation acts" that knows what each field must
look like.

## A Pydantic model is the contract

You met Pydantic in module 9. Here it does the job it was built for: validating data from a source
you don't control. The model *is* the contract between your code and the LLM:

```python
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

class Invoice(BaseModel):
    invoice_number: str = Field(min_length=1)
    vendor: str
    currency: Literal["EUR", "GBP", "USD"]
    total: Decimal = Field(gt=0, decimal_places=2)
    due_date: date

good = {"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "currency": "EUR",
        "total": "1240.50", "due_date": "2026-10-15"}
Invoice.model_validate(good)
```

Pydantic coerces where it's safe (the string `"1240.50"` becomes a `Decimal`, the ISO date becomes
a `date`) and refuses where it isn't. The reply from above fails on four fields at once:

```python raises
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

class Invoice(BaseModel):
    invoice_number: str = Field(min_length=1)
    vendor: str
    currency: Literal["EUR", "GBP", "USD"]
    total: Decimal = Field(gt=0, decimal_places=2)
    due_date: date

Invoice.model_validate({"invoice_number": "", "vendor": "Kiln Supplies", "total": "1.240,50",
                        "currency": "euro", "due_date": "next Friday"})
```

That's the line you want in your automation: after it, every field has the type and range your
code assumes, and before it, nothing touches the accounting system.

> [!JS]
> Coming from TypeScript: this is `zod`'s `Invoice.parse(data)`. `model_validate` plays the same
> role, and `ValidationError.errors()` is `ZodError.issues`.

```quiz
question: "The model returns \"total\": 1240.5, a number rather than a string. What does the Invoice model above do with it?"
options:
  - "Rejects it: the field is a Decimal, not a float"
  - "Accepts it as Decimal('1240.5')"
  - "Rounds it to Decimal('1240.50')"
answer: 1
explain: In the default lax mode, Pydantic converts a JSON number to Decimal. It has at most two decimal places, so decimal_places=2 is satisfied, and the value keeps the precision it arrived with. Nothing rounds it for you.
```

## Errors the model can read

A `ValidationError` has everything needed to explain what's wrong. `error.errors()` returns one
dict per problem, with the field's location and a readable message:

```python
from pydantic import BaseModel, Field, ValidationError

class Invoice(BaseModel):
    invoice_number: str = Field(min_length=1)
    total: float = Field(gt=0)

try:
    Invoice.model_validate({"total": -40})
except ValidationError as error:
    problems = [f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in error.errors()]

problems
```

Those lines are written for a developer, and they turn out to be just as clear to the model that
produced the bad reply. That's the idea behind the rest of this lesson.

## The repair loop

When validation fails, you have three choices: give up, retry the same request and hope, or tell
the model what was wrong. The third works far better, because the model can see its own mistake.
You continue the conversation: its bad reply goes in as an **assistant** message, and your
feedback goes in as the next **user** message.

```python
class CannedLLM:
    """A stand-in for your A2 client that replays canned replies. The drills use ScriptedLLM."""
    def __init__(self, *replies):
        self.replies, self.calls = list(replies), []

    def complete(self, messages, **options):
        self.calls.append([dict(m) for m in messages])
        return type("Response", (), {"text": self.replies.pop(0), "stop_reason": "end_turn"})

llm = CannedLLM('{"invoice_number": "INV-2291", "total": "1.240,50"}',
                '{"invoice_number": "INV-2291", "total": "1240.50"}')

messages = [{"role": "user", "content": "<invoice>\n...\n</invoice>"}]
first = llm.complete(messages)
# Validation fails on total, so the reply and the problem go back into the conversation:
messages += [
    {"role": "assistant", "content": first.text},
    {"role": "user", "content": "Your reply had these problems:\n"
                                "total: Input should be a valid decimal\n"
                                "Reply with only the corrected JSON object."},
]
second = llm.complete(messages)
[m["role"] for m in llm.calls[1]], second.text
```

The second request carries the whole story: the task, the attempt, and exactly what to change.
The model doesn't have to rediscover the invoice, only fix one field.

> [!WARNING]
> Don't skip the assistant message and send the feedback alone. The model then reads "total:
> Input should be a valid decimal" with no idea which reply it refers to, and both providers expect
> user and assistant turns to alternate.

## Knowing when to stop

Some replies can't be repaired. If the invoice really has no invoice number, no amount of
feedback will make one appear, and a loop that retries until it succeeds will retry forever,
spending money on every turn. Each attempt resends the whole growing conversation, so the third
attempt costs more input tokens than the first.

So the loop is always **bounded**:

- Allow a small number of attempts, usually 2 or 3 in total. If three tries haven't fixed it,
  a fourth rarely does.
- After the last attempt, raise an exception that carries the last reply and the last problems,
  so the item can go to a human review queue with the evidence attached.
- Don't retry a reply cut off at `max_tokens` with the same limit: it'll be cut off again.

```python
MAX_ATTEMPTS = 3

class ExtractionFailed(Exception):
    def __init__(self, problems, last_reply):
        super().__init__(f"No valid invoice after {MAX_ATTEMPTS} attempts: {problems}")
        self.problems = problems
        self.last_reply = last_reply

error = ExtractionFailed("invoice_number: Field required", '{"vendor": "Kiln Supplies"}')
str(error), error.last_reply
```

```quiz
question: 'An invoice is missing its invoice number, and the model keeps returning "invoice_number": "". With MAX_ATTEMPTS = 3, how many calls does the loop make before it raises?'
options:
  - "1"
  - "3"
  - "4: the first call plus three retries"
answer: 1
explain: MAX_ATTEMPTS counts calls, including the first. Decide which one you mean and name it clearly; "retries" and "attempts" differ by one, and the difference is a whole paid call per failing item.
```

## Where this leaves you

Parse, then validate against a Pydantic model that states exactly what each field must be. When
validation fails, append the bad reply as an assistant message and the errors as a user message,
and ask again, a fixed number of times. When the attempts run out, raise with the evidence so a
person can take over. The drills build each piece: readable errors, the invoice model, a retry loop
that stops, and the full repair loop.
