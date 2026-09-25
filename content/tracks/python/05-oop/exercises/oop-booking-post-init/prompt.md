Write a `Booking` dataclass for a small hotel.

- Fields passed in: `guest`, `check_in`, `check_out` and `nightly_rate`, in that order. The dates
  may be `datetime.date` objects or ISO strings like `"2026-10-01"`; strings are converted to dates.
- Two fields are computed, not passed in: `nights`, the number of nights, and `total`, nights times
  the rate, rounded to 2 decimals.
- Raise `ValueError` if `check_out` isn't after `check_in`, or if `nightly_rate` isn't positive.

```python
stay = Booking("Ada", "2026-10-01", date(2026, 10, 4), 120.0)
stay.nights, stay.total    # (3, 360.0)
stay
# Booking(guest='Ada', check_in=datetime.date(2026, 10, 1), check_out=datetime.date(2026, 10, 4),
#         nightly_rate=120.0, nights=3, total=360.0)

Booking("Grace", "2026-10-04", "2026-10-01", 120.0)   # ValueError
```
