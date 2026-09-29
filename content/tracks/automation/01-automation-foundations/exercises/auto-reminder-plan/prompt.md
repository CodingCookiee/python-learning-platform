The clinic's reminder job runs every hour. Write its decision step, `plan_reminders(appointments, now)`,
as a pure function: it returns the reminders to send and sends nothing.

Each appointment is a dict:

```python
{
    "id": 501,
    "status": "booked",                 # or "cancelled", "completed"
    "starts": datetime(...),            # timezone-aware
    "reminded": False,                  # True once a reminder has gone out
    "patient": {"name": "Amira", "mobile": "+447700900123", "email": "amira@example.com", "sms_ok": True},
}
```

Remind an appointment when all of these hold:

- its status is `"booked"`,
- it hasn't been reminded yet,
- it starts **more than 2 hours** after `now` and **no more than 24 hours** after it.

Send by SMS when the patient has a `mobile` and `sms_ok` is true, otherwise by email if they have
an `email`. A patient with neither gets no reminder (the receptionist handles them). `mobile` and
`email` may be `None`.

Return a list of `{"appointment": id, "channel": "sms" or "email", "to": number or address}`
dicts, ordered by start time.

```python
now = datetime(2026, 3, 9, 8, 0, tzinfo=UTC)
plan_reminders([amira_tomorrow_7am, tom_in_1_hour], now)
# [{"appointment": 501, "channel": "sms", "to": "+447700900123"}]
```
