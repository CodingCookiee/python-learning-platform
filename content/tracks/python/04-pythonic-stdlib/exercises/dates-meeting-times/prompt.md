A distributed team schedules a meeting at an exact moment and wants to see it in everyone's local
time. Write `local_times(meeting, zones)`, where `meeting` is an aware `datetime` and `zones` is a
list of IANA zone names. Return a dict mapping each zone name to the local weekday and time, like
`"Thu 14:00"`, in the same order as `zones`.

```python
from datetime import datetime, timezone

meeting = datetime(2026, 10, 15, 13, 0, tzinfo=timezone.utc)
local_times(meeting, ["Europe/London", "America/New_York", "Asia/Karachi"])
# {"Europe/London": "Thu 14:00", "America/New_York": "Thu 09:00", "Asia/Karachi": "Thu 18:00"}
```

The answers must follow daylight saving time. A naive `meeting` isn't a moment at all, so raise
`ValueError` for one.
