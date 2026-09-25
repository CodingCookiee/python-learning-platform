Web servers write timestamps like `25/Sep/2026:14:03:07 +0000`: day, month abbreviation, year,
time, then the offset from UTC. Write `parse_log_time(text)` that returns an **aware**
`datetime` for it.

```python
parse_log_time("25/Sep/2026:14:03:07 +0000")
# datetime(2026, 9, 25, 14, 3, 7, tzinfo=timezone.utc)
parse_log_time("25/Sep/2026:16:03:07 +0200").utcoffset()
# timedelta(seconds=7200), which is two hours
```

Text that isn't in this format should raise `ValueError`.
