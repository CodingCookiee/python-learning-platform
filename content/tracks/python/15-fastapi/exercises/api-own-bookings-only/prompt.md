Tidewater Tours' booking API authenticates every request (the `current_account` dependency works),
but then shows everyone everything: any customer can read any booking by guessing ids. Build the
three endpoints so each account sees only what it should. An account is a dict with a `role`
(`"customer"` or `"staff"`) and a `customer_id` (`None` for staff).

| Request | Customer | Staff |
|---------|----------|-------|
| `GET /bookings` | their own bookings only | every booking |
| `GET /bookings/{booking_id}` | their own booking; anyone else's is `404` | any booking |
| `DELETE /bookings/{booking_id}` | `403`, detail `Only staff can delete bookings` | `204`, and it's deleted |

A booking that doesn't exist is a `404` with the detail `Booking B-9 not found` (with the real id),
and someone else's booking gets exactly the same response, so a customer can't tell the difference.
Lists keep the order of `bookings`.

```text
GET /bookings        X-API-Key: key_ada_3f9e    ->  200 [<B-1>, <B-3>]
GET /bookings/B-2    X-API-Key: key_ada_3f9e    ->  404 {"detail": "Booking B-2 not found"}
GET /bookings/B-2    X-API-Key: key_desk_0d7a   ->  200 <B-2>
DELETE /bookings/B-1 X-API-Key: key_ada_3f9e    ->  403 {"detail": "Only staff can delete bookings"}
```
