Guests can change a hotel booking from the app: the number of guests, the check-in date, or the
note for the front desk. Build `PATCH /bookings/{booking_id}` for the bookings stored in `bookings`
(you can assume the booking exists).

**`BookingUpdate`**, the body. Every field is optional, and only the fields the client sends change:

| Field | Rules | Can it be `null`? |
|-------|-------|-------------------|
| `guests` | an integer from 1 to 6 | no: `422` |
| `check_in` | a date | no: `422` |
| `notes` | at most 500 characters | yes: `null` clears the note |

Any other key, such as `guest_name` or a typo like `guest`, is refused with `422`.

**`BookingRead`**, the response: `id`, `guest_name`, `guests`, `check_in` and `notes`.

```text
Stored: {"id": 7, "guest_name": "Ada Lovelace", "guests": 2, "check_in": 2026-10-01, "notes": "Late arrival"}

PATCH /bookings/7  {"guests": 3}
  ->  200 {"id": 7, "guest_name": "Ada Lovelace", "guests": 3, "check_in": "2026-10-01", "notes": "Late arrival"}
PATCH /bookings/7  {"notes": null}          ->  200, notes is now null, everything else unchanged
PATCH /bookings/7  {"guests": null}         ->  422
PATCH /bookings/7  {"guest_name": "Eve"}    ->  422
```

A refused request changes nothing.
