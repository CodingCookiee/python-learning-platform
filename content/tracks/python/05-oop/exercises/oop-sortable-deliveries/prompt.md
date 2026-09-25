The dispatch desk works through deliveries in a fixed order: earliest expected date first, then
lowest priority number (1 is most urgent), then tracking code. Write a `Delivery` dataclass that
sorts itself that way, and two helpers.

- `Delivery(eta, priority, tracking)`: `eta` is a `datetime.date`. A fourth field, `notes`, is an
  optional list that defaults to a new empty list for each delivery. Notes never affect comparisons.
- Deliveries support `<`, `<=`, `>`, `>=` in dispatch order, and `==` on everything but notes.
- Instances have a fixed set of attributes: assigning one that isn't a field raises
  `AttributeError`.
- `add_note(text)` appends to `notes`.
- `overdue(deliveries, today)` returns the deliveries whose `eta` is before `today`, in dispatch
  order.
- `by_day(deliveries)` returns a dict mapping each `eta` to the tracking codes due that day, in
  dispatch order, with the days in date order.

```python
queue = [
    Delivery(date(2026, 9, 26), 2, "RB222"),
    Delivery(date(2026, 9, 25), 3, "RA333"),
    Delivery(date(2026, 9, 26), 1, "RC111"),
]
[d.tracking for d in sorted(queue)]     # ["RA333", "RC111", "RB222"]
by_day(queue)
# {date(2026, 9, 25): ["RA333"], date(2026, 9, 26): ["RC111", "RB222"]}
overdue(queue, date(2026, 9, 26))       # [Delivery(eta=datetime.date(2026, 9, 25), ...)]
```
