The weekly email lists upcoming interviews with their company and role. The starter has three
models: `Company` → `Application` → `Interview`, all with the default lazy relationships. Write:

- `schedule(session, start, end)` returns the `Interview` objects scheduled at or after `start`
  and before `end`, earliest first, with each interview's application **and** that application's
  company already loaded. The whole schedule must take **one** query, and the objects must still
  work after the session is closed.
- `format_schedule(interviews)` returns one line per interview: the time as
  `Mon 14 Sep 10:00`, two spaces, the company left-aligned in 12, the role left-aligned in 20,
  then the kind in brackets.

```python
with Session(engine) as session:
    week = schedule(session, datetime(2026, 9, 14), datetime(2026, 9, 21))
format_schedule(week)
# ["Mon 14 Sep 10:00  Northwind   Backend engineer    (phone screen)",
#  "Wed 16 Sep 11:30  Globex      Data engineer       (video)"]
```
