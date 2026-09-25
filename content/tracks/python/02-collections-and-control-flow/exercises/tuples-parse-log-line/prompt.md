Each line in a server log has a date, a time, a level, and then a free-text message:

```text
2026-09-25 14:02:11 ERROR Disk almost full on /var
```

Write `parse_entry(line)` that returns a tuple `(date, time, level, message)`:

```python
parse_entry("2026-09-25 14:02:11 ERROR Disk almost full on /var")
# ("2026-09-25", "14:02:11", "ERROR", "Disk almost full on /var")
```

Words in the message are separated by single spaces. Some entries have no message at all
(`"2026-09-25 14:05:00 HEARTBEAT"`): return `""` as the message for those.
