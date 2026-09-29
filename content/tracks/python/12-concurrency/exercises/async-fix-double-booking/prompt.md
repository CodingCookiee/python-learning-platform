Tickets for a small gig went on sale at 10:00, and the venue has 3 seats. The box office sold 10
tickets. Each `BoxOffice` sells seats for one venue, whose async API has `seats_left()` and
`reserve(customer)`:

```python
office = BoxOffice(venue)                 # venue has 3 seats
await asyncio.gather(*(office.book(fan) for fan in fans), return_exceptions=True)
venue.reserved     # ["fan-1", "fan-2", ..., "fan-10"]: ten tickets for three seats
```

Fix `BoxOffice` so that it never sells more seats than the venue has. When the venue is full,
`book` raises `SoldOut` with the customer's name in the message. Bookings for **different** venues
must not wait for each other.
