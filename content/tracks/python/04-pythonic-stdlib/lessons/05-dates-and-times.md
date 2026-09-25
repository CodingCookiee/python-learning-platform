---
slug: dates-and-times
title: Dates, times and time zones
summary: Aware versus naive datetimes, timedelta arithmetic, real time zones with zoneinfo, and parsing and formatting timestamps.
minutes: 45
exercises:
  - dates-parse-log-time
  - dates-predict-timedelta
  - dates-fix-expiry
  - dates-business-days
  - dates-meeting-times
  - dates-time-ago
---

Timestamps look simple until the first time a report is an hour out because the clocks changed, or
a customer in Karachi sees a delivery slot for yesterday. Python's `datetime` module gets this right,
but only if you use it the right way: keep times **aware** of their time zone, do the arithmetic in
UTC, and convert to local time only when you show it to someone.

## Dates, times and datetimes

The `datetime` module has three main types: `date` (a calendar day), `time` (a time of day) and
`datetime` (both). They are immutable, and each field is an attribute:

```python
from datetime import date, datetime

launch = date(2026, 9, 25)
placed = datetime(2026, 9, 25, 14, 3, 7)

launch.year, launch.weekday(), placed.hour, placed.date(), placed.isoformat()
```

`weekday()` counts from Monday as `0`, so the `4` means Friday. `isoformat()` gives the standard
`YYYY-MM-DDTHH:MM:SS` form, which sorts correctly as text and is what APIs expect.

## Arithmetic with timedelta

A `timedelta` is a duration. Add one to a date or datetime to move it, and subtract two datetimes to
get the `timedelta` between them:

```python
from datetime import datetime, timedelta

placed = datetime(2026, 9, 25, 14, 0)
promised = placed + timedelta(days=2, hours=6)
delivered = datetime(2026, 9, 28, 9, 30)

late_by = delivered - promised
promised, late_by, late_by.total_seconds() / 3600
```

A `timedelta` stores only days, seconds and microseconds, so `late_by.seconds` is the leftover
seconds *after* the whole days, not the whole duration. Use `total_seconds()` when you want the full
length as one number.

> [!WARNING]
> There is no `timedelta(months=1)`, because a month isn't a fixed length. "The same day next month"
> is a calendar question (what is one month after 31 January?), so decide the rule yourself, or
> count days.

## Naive and aware datetimes

A `datetime` with no time zone is **naive**: it's a wall-clock reading with no zone attached.
"14:00" could be any of two dozen different moments. A datetime with a `tzinfo` is **aware**: it
names an exact instant. Python refuses to compare or subtract the two kinds, because the answer
would be a guess:

```python raises
from datetime import datetime, timezone

placed = datetime(2026, 9, 25, 9, 30)                       # naive
now = datetime(2026, 9, 25, 10, 0, tzinfo=timezone.utc)     # aware
now - placed
```

(`==` between them doesn't raise. It just says `False`, which is its own kind of trap.)

The rule that avoids nearly every time bug: **make every datetime aware, and store and compute in
UTC.** Get the current time with `datetime.now(timezone.utc)`, never the naive `datetime.now()` or
the deprecated `datetime.utcnow()`. Aware datetimes compare by the instant they name, whatever zone
they're shown in:

```python
from datetime import datetime, timedelta, timezone

karachi = timezone(timedelta(hours=5))
meeting = datetime(2026, 10, 15, 13, 0, tzinfo=timezone.utc)
local = meeting.astimezone(karachi)

local, local == meeting
```

`astimezone()` converts an aware datetime to another zone. It changes the clock reading, not the
moment, so the two compare equal.

> [!JS]
> Coming from JavaScript: a `Date` is always a UTC instant, shown in the machine's zone. A naive
> Python datetime is different: it has no zone at all, so it isn't an instant until you give it one.

## Real time zones with zoneinfo

A fixed offset like `timezone(timedelta(hours=5))` is fine for Karachi, which has no daylight
saving time. London and New York change their offset twice a year, so for a *place* use
`zoneinfo.ZoneInfo` with a name from the IANA time zone database. It knows every rule change:

```python norun
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

london = ZoneInfo("Europe/London")
summer = datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)
winter = datetime(2026, 12, 1, 12, 0, tzinfo=timezone.utc)
summer.astimezone(london).isoformat(), winter.astimezone(london).isoformat()
```

```text
('2026-07-01T13:00:00+01:00', '2026-12-01T12:00:00+00:00')
```

Noon UTC is 1pm in a London summer and noon in a London winter. It works the other way too: attach
a zone to a local wall-clock time and convert it to UTC. A 9am stand-up in New York moves by an hour
in UTC when the clocks go back on 1 November:

```python norun
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

new_york = ZoneInfo("America/New_York")
before = datetime(2026, 10, 30, 9, 0, tzinfo=new_york)
after = datetime(2026, 11, 6, 9, 0, tzinfo=new_york)
before.astimezone(timezone.utc).isoformat(), after.astimezone(timezone.utc).isoformat()
```

```text
('2026-10-30T13:00:00+00:00', '2026-11-06T14:00:00+00:00')
```

> [!NOTE]
> `zoneinfo` reads the time zone database from the operating system. Windows doesn't ship one, so
> projects that run there add the `tzdata` package (`uv add tzdata`). The drills in this lesson
> load it for you.

```quiz
question: A shop in Europe/London opens at 09:00 local time every day. Which is the right way to store that?
options:
  - "09:00 UTC"
  - "09:00 with a fixed +01:00 offset"
  - "09:00 with ZoneInfo('Europe/London'), converted to UTC for each day"
answer: 2
explain: London is UTC+1 in summer and UTC+0 in winter, so a fixed offset is wrong for half the year. A named zone applies the right offset on each date.
```

## Parsing and formatting

`strptime` ("string parse time") reads text in a format you describe, and `strftime` writes one.
The codes you'll use most are `%Y` (2026), `%m` (09), `%d` (25), `%H:%M:%S` (14:03:07), `%b`
(Sep), `%a` (Fri) and `%z` (+0000). Web-server logs use a format of their own:

```python
from datetime import datetime

stamp = datetime.strptime("25/Sep/2026:14:03:07 +0000", "%d/%b/%Y:%H:%M:%S %z")
stamp, stamp.strftime("%a %d %b %Y, %H:%M")
```

Because the text includes `+0000` and the format includes `%z`, the result is aware. Leave either
out and you get a naive datetime. If the text doesn't match the format, `strptime` raises
`ValueError`, with a message saying which part didn't fit:

```python raises
from datetime import datetime

datetime.strptime("2026-09-25", "%d/%m/%Y")
```

For ISO 8601 text, the format APIs and databases use, skip the codes entirely:
`fromisoformat` reads it, offsets and a trailing `Z` included, and `isoformat` writes it. A format
spec in an f-string calls `strftime` for you:

```python
from datetime import datetime

placed = datetime.fromisoformat("2026-09-25T14:03:07+05:00")
placed.isoformat(), f"Placed on {placed:%d %b at %H:%M}"
```

> [!TIP]
> `%a` and `%b` produce English names in the default "C" locale that servers use. For names in the
> user's language, a library like Babel is the reliable choice.

## Pass now in

A function that calls `datetime.now()` inside gives a different answer every time it runs, so its
tests can't know what to expect. Have it take `now` as a parameter instead. Production code passes
`datetime.now(timezone.utc)`; tests pass any moment they like:

```python
from datetime import datetime, timezone


def is_overdue(due, now):
    return now > due


due = datetime(2026, 9, 30, 17, 0, tzinfo=timezone.utc)
is_overdue(due, now=datetime(2026, 10, 1, 9, 0, tzinfo=timezone.utc))
```

Every drill in this lesson that depends on the current time takes `now` this way.

## Where this leaves you

Make datetimes aware, compute in UTC, and convert with `astimezone` when you display them, using
`ZoneInfo` for any place with daylight saving time. `timedelta` measures durations, `strptime` and
`strftime` handle custom formats, and `fromisoformat` handles the standard one. Functions that need
the current time take it as `now`. The drills parse log timestamps, fix a naive-versus-aware bug,
count business days and schedule a meeting across time zones.
