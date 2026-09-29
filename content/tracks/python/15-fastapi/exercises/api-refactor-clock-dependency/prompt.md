Tidewater Tours lets customers cancel a tour online up to 48 hours before it starts, and quotes the
refund first. Both endpoints work, but nobody can test them: they read the real clock with
`datetime.now(UTC)`, so "47 hours before" can only be tested 47 hours before a real tour.

Refactor so time is a dependency:

- Add `get_now()`, which returns `datetime.now(UTC)`.
- Both endpoints receive the current time from `get_now` through `Depends`, instead of reading the
  clock themselves. `get_now` should be the only place that calls `datetime.now`.
- The behaviour doesn't change.

A test can then pin the time:

```python
app.dependency_overrides[get_now] = lambda: datetime(2026, 10, 8, 10, 0, tzinfo=UTC)
# The harbour kayak tour starts 2026-10-10 09:00 UTC: 47 hours later
POST /bookings/B-1001/cancel      ->  409
GET  /bookings/B-1001/refund      ->  {"booking_id": "B-1001", "refund_percent": 0}
```
