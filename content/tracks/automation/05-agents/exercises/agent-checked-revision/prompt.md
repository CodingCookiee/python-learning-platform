Critique rounds cost money, and half of what the critic catches is mechanical: a missing amount, a
draft that's too long. Write the reminder writer so the free checks run first:

```python
code_problems(text, invoice) -> list[str]
write_reminder(llm, invoice, *, max_rounds=3) -> Drafted
```

`code_problems` returns these messages, in this order, for each check that fails:

| Check | Message |
|-------|---------|
| mentions `invoice["number"]` | `Mention the invoice number INV-2291.` |
| mentions `invoice["amount"]` | `Mention the amount 1,450.00.` |
| at most 120 words (`len(text.split())`) | `Keep it to 120 words; this draft has 143.` |
| no "legal action" or "late fee", any case | `Don't mention legal action or late fees.` |

`write_reminder` writes the first draft with `write_prompt(invoice)`, then for each round (at most
`max_rounds`):

1. Run `code_problems`. If there are any, they're this round's problems, and **the critic isn't called**.
2. If there are none, call the critic with `critic_prompt(invoice, draft)`. A reply of `APPROVED`
   (after stripping) returns `Drafted(draft, round, True, [])`. Anything else is the problems:
   one per non-empty line, stripped, with a leading `- ` removed.
3. If this was the last round, return `Drafted(draft, round, False, problems)`. Otherwise revise
   with `revise_prompt(invoice, draft, problems)`; its reply is the new draft.

Every model call is a single user message with `system=WRITER`, and the helpers are in the starter.

```python
llm = ScriptedLLM([
    "Hi Harbour Dental, invoice INV-2291 is 18 days overdue.",           # draft: no amount
    "Hi Harbour Dental, invoice INV-2291 (1,450.00) is overdue. Pay now.",  # revised; code checks pass
    "- Sounds curt: soften the last sentence.",                           # critic
    "Hi Harbour Dental, invoice INV-2291 (1,450.00) is overdue. Could you pay this week?",
    "APPROVED",
])
write_reminder(llm, INVOICE)   # Drafted(text="Hi Harbour Dental, ... this week?", rounds=3, approved=True, problems=[])
```
