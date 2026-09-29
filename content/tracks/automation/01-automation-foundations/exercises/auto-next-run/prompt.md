Every scheduler's dashboard shows "next run". Write `next_run(expr, after)` that returns the first
datetime **strictly after** `after` at which the cron expression runs. Seconds and microseconds
of the result are 0, and it keeps `after`'s `tzinfo`.

`expand_field(field, low, high)` is provided and works. Follow cron's rules from the last drill:
weekdays count Sunday as 0 (or 7), and when both day fields are restricted (neither starts with
`*`), a day matches if either one does.

```python
next_run("0 9 * * 1", datetime(2026, 3, 10, 12, 0))    # a Tuesday
# datetime(2026, 3, 16, 9, 0): the next Monday at 09:00
```

It has to be quick even when the next run is years away (`0 0 29 2 *` waits for a leap year), and
some expressions never run at all (`0 0 30 2 *`): raise `ValueError` if there's no run in the
next five years.
