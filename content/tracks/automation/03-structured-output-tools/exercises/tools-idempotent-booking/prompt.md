The clinic's assistant sometimes books the same slot twice: the model repeats a `book_appointment`
call it isn't sure worked, or the loop retries after a timeout. Make the tool idempotent.

Write `book_appointment(client, practitioner, start, patient_email)`, the tool function behind the
assistant. `client` is an `httpx.Client` for the clinic's booking API (the tests give it a fake):

- `GET /v1/bookings?practitioner=...&start=...` returns `{"bookings": [...]}`, each booking a dict
  with `booking_id`, `practitioner`, `start` and `patient_email`.
- `POST /v1/bookings` with those three fields as JSON creates a booking and returns it, or answers
  `409` if the slot has just been taken.

The tool returns a dict for the model:

1. If the slot already has a booking **for this patient**, don't create another: return
   `{"booking_id": ..., "status": "already_booked"}`.
2. If it has a booking for someone else, return `{"error": SLOT_TAKEN}` (in the starter).
3. Otherwise POST the booking with an `Idempotency-Key` header, the `idempotency_key` of
   `"book_appointment"` and the three arguments as a dict (the helper is in the starter), and
   return `{"booking_id": ..., "status": "booked"}`. A `409` answer returns `{"error": SLOT_TAKEN}`.

```python
book_appointment(client, "Patel", "2026-10-01T14:30", "ada@example.com")
# {"booking_id": "BK-5521", "status": "booked"}
book_appointment(client, "Patel", "2026-10-01T14:30", "ada@example.com")
# {"booking_id": "BK-5521", "status": "already_booked"}   (and no second POST)
```
