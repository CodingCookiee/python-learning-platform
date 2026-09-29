`range()` doesn't work with dates, and the booking system needs to walk through every night of a
stay. Write an iterator class `DateRange(start, stop, step_days=1)`:

- It produces `start`, `start + step_days`, and so on, stopping **before** `stop`, just like
  `range()`.
- It's an iterator: it works with `next()` and in a `for` loop, `iter()` returns the object itself,
  and once it's finished every further `next()` raises `StopIteration`.
- A `step_days` below 1 raises `ValueError` when the `DateRange` is created.

```python
from datetime import date

nights = DateRange(date(2026, 9, 28), date(2026, 10, 1))
list(nights)
# [date(2026, 9, 28), date(2026, 9, 29), date(2026, 9, 30)]
list(nights)
# []   (an iterator is used up after one pass)
```
