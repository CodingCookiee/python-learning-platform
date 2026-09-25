A subscription service stores each expiry time as ISO 8601 text with an offset, such as
`"2026-10-01T09:00:00+02:00"`. `is_expired(expires_at, now)` should say whether `now` (an aware
datetime) has reached that moment, but every call crashes:

```python
from datetime import datetime, timezone

is_expired("2026-10-01T09:00:00+02:00", datetime(2026, 10, 1, 7, 0, tzinfo=timezone.utc))
# TypeError: can't compare offset-naive and offset-aware datetimes
# should be True: 09:00 at +02:00 is 07:00 UTC
```

Fix it. `now` can be in any time zone, and some expiry times end in `Z` (UTC) instead of an
offset.
