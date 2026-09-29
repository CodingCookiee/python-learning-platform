The hotel's booking API works, but its errors come in three shapes, and the app team has asked for
one. Add exception handlers (don't change the endpoints) so that **every** error response looks
like this:

```json
{"error": {"code": "not_found", "message": "Booking 99 not found"}}
```

| Error | Status | `code` | `message` |
|-------|--------|--------|-----------|
| Any `HTTPException`, including the router's own 404 and 405 | its status | from `ERROR_CODES`, or `"error"` for any other status | the exception's `detail` |
| A request that fails validation | `422` | `"validation_failed"` | `"The request is invalid"` |
| `RoomUnavailable`, raised by `reserve()` | `409` | `"room_unavailable"` | the exception's text, e.g. `Room 204 is not available on 2026-10-01` |

A validation error also has a `fields` list, one entry per problem, with the location joined by
dots and Pydantic's message:

```json
{"error": {"code": "validation_failed", "message": "The request is invalid",
           "fields": [{"field": "body.nights", "message": "Input should be greater than or equal to 1"}]}}
```

Headers set on an `HTTPException` must survive: a `405` still says which methods are allowed.

```text
GET  /bookings/99     ->  404 {"error": {"code": "not_found", "message": "Booking 99 not found"}}
GET  /nowhere         ->  404 {"error": {"code": "not_found", "message": "Not Found"}}
POST /bookings  {"room_number": 204, "check_in": "2026-10-01", "nights": 2}
                      ->  409 {"error": {"code": "room_unavailable", "message": "Room 204 is not available on 2026-10-01"}}
```
