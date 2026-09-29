The mobile team's booking client keeps misbehaving, and it's the API's fault:

1. Creating a booking answers `200`. It should answer `201 Created`, with the booking as the body.
2. Cancelling a booking answers `200` with `{"deleted": true}`. It should answer `204 No Content`,
   with an empty body.
3. Cancelling a booking that doesn't exist crashes with a `500`. It should answer `404` with the
   detail `Booking 99 not found` (with the real id).

```text
POST /bookings  {"guest_name": "Ada", "room_number": 204}  ->  201 {"id": 1, "guest_name": "Ada", "room_number": 204}
DELETE /bookings/1                                          ->  204 (no body)
DELETE /bookings/99                                         ->  404 {"detail": "Booking 99 not found"}
```
