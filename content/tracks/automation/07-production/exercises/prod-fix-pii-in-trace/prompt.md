The email triage agent labels a client's inbound email as billing, shipping, returns or other. It
works, and the client's data protection officer has just read its logs and traces: every
customer's email address, the first 120 characters of every message, and in one case a card
number. Everything the logs hold is copied to the log provider and kept for a year.

Fix `triage(llm, tracer, email)` so nothing personal is kept, using `redact` and `user_ref` from the
starter (both already correct):

- The `"triage_email"` span's attributes are exactly `user` (the sender's `user_ref`), `subject`
  (the subject, redacted), `body_chars` (the length of the body) and `label`.
- The log lines refer to the email by its `id` and the sender by their `user_ref`, and include no
  address, no body text and no unredacted subject.
- The model still receives the whole, unredacted body, as now: it can't classify what it can't read.
- It still returns the label.

```python
email = {"id": "msg_5521", "from": "ada.byrne@example.com", "subject": "Refund for order 1042",
         "body": "Hi, I'm Ada. Please refund order 1042 to my card. Call me on +44 7700 900123."}
triage(llm, tracer, email)                          # "returns"
tracer.spans[0].attributes
# {'user': 'u_…', 'subject': 'Refund for order 1042', 'body_chars': 77, 'label': 'returns'}
```
