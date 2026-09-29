Brightline Bookkeeping chases its clients' unpaid invoices. Build it as a workflow: the rules live
in your code, and the model only writes the email.

```python
chase_invoice(llm, invoice, *, today) -> Action
```

`invoice` is a dict with `number`, `client`, `amount` (a string such as `"1,450.00"`) and `due` (a
`date`). Work out the days overdue as `(today - due).days`, then:

| Days overdue | Action | Model call? |
|--------------|--------|-------------|
| under 3 (including not yet due) | `Action("wait")` | no |
| 3 to 13 | `Action("email", "friendly", text)` | yes |
| 14 to 29 | `Action("email", "firm", text)` | yes |
| 30 or more | `Action("escalate")`: a person phones them | no |

For an email, make exactly one call: `system=WRITER_SYSTEM` (in the starter), `max_tokens=300`, and
one user message that contains the invoice number, the client, the amount, the days overdue (as
`18 days overdue`) and the tone, between `<invoice>` and `</invoice>` tags. The `text` is the
model's reply with surrounding whitespace stripped.

```python
invoice = {"number": "INV-2291", "client": "Harbour Dental", "amount": "1,450.00", "due": date(2026, 9, 11)}
llm = ScriptedLLM(["Hi Harbour Dental team, invoice INV-2291 for 1,450.00 is now 18 days overdue..."])
chase_invoice(llm, invoice, today=date(2026, 9, 29))
# Action(kind="email", tone="firm", text="Hi Harbour Dental team, invoice INV-2291 for 1,450.00 is now 18 days overdue...")
```
