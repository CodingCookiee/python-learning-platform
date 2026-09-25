An activity feed shows how long ago each event happened. Write `time_ago(then, now)` for two aware
datetimes:

| How long ago | Returns |
|--------------|---------|
| under 1 minute | `"just now"` |
| under 1 hour | `"1 minute ago"`, `"12 minutes ago"` |
| under 24 hours | `"1 hour ago"`, `"5 hours ago"` |
| under 48 hours | `"yesterday"` |
| 48 hours or more | `"2 days ago"`, `"9 days ago"` |

Counts are whole units, rounded down, so 90 minutes is `"1 hour ago"`.

```python
from datetime import datetime, timezone

now = datetime(2026, 9, 25, 14, 0, tzinfo=timezone.utc)
time_ago(datetime(2026, 9, 25, 13, 55, tzinfo=timezone.utc), now)   # "5 minutes ago"
time_ago(datetime(2026, 9, 24, 8, 0, tzinfo=timezone.utc), now)     # "yesterday"
```

`then` and `now` may be in different time zones. If `then` is after `now`, raise `ValueError`.
