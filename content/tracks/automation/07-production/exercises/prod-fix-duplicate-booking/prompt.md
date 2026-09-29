`process_invoice(llm, http, document)` extracts an invoice with the model, books it as a bill in
the client's accounting system (`POST /v1/bills`), and asks the model for a one-line summary for
the finance approver. Timeouts are retried, up to `MAX_ATTEMPTS` runs.

During Tuesday's slowdown, the summary call timed out on the first attempt for three invoices, and
all three were booked twice. The retry runs the whole pipeline again, post included.

The accounting API supports idempotency keys: a `POST /v1/bills` with an `Idempotency-Key` header
it has seen before returns the bill it created the first time, and creates nothing. Fix
`process_invoice` so each document is booked **once**, however many attempts or runs it takes:

- Send an `Idempotency-Key` header of `bill:<document id>` with every post, the same on every
  attempt and every later run for that document.
- Keep the retries: a timeout still leads to another attempt, and the result is still the bill with
  its `"summary"`.

```python
document = {"id": "doc_88213", "text": "Kiln Supplies ... INV-2291 ... total 1,240.50 EUR"}
bill = process_invoice(llm, http, document)     # the summary times out once, then works
bill["bill_id"], bill["summary"]                # ("B-0001", "Kiln Supplies, INV-2291, 1,240.50 EUR due in 30 days.")
# and the accounting system holds exactly one bill
```
