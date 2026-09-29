The clinic's scheduler checks each minute with `cron_matches(expr, when)`, which should return
`True` when the cron expression runs at the datetime `when`. `expand_field` works (it's the last
drill's answer). The team meeting reminder is scheduled for 09:00 on Mondays:

```python
cron_matches("0 9 * * 1", datetime(2026, 3, 9, 9, 0))     # Monday 9 March: False, should be True
cron_matches("0 9 * * 1", datetime(2026, 3, 10, 9, 0))    # Tuesday 10 March: True, should be False
```

Fix `cron_matches` so that it follows cron's rules:

- the weekday field counts **Sunday as 0** (and also accepts 7 for Sunday), Monday as 1, up to
  Saturday as 6;
- when **both** the day-of-month and day-of-week fields are restricted, the expression runs when
  **either** matches: `0 9 1 * 1` runs at 09:00 on the 1st of each month and at 09:00 every Monday.
  A day field that starts with `*` counts as unrestricted, and then only the other one matters.
