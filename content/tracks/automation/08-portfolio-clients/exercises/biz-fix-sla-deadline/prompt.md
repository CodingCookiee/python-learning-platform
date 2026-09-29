Your retainer promises a first response within 4 **working** hours: 09:00 to 17:00, Monday to
Friday, not counting public holidays. `response_due(reported, hours, *, holidays=())` should say
when the response is due for an incident reported at `reported` (a naive `datetime` in the client's
local time). `holidays` is a collection of `date`s that aren't working days.

The helpdesk tool uses it to show the deadline, and it told the clinic that an incident reported at
16:00 on a Friday would get a response by 20:00 that evening. Fix it.

```python
response_due(datetime(2026, 10, 9, 16, 0), 4)    # a Friday
# datetime(2026, 10, 12, 12, 0)                  # 1 hour on Friday, 3 on Monday
```

An incident reported outside working hours starts the clock at the next opening time, and a
deadline can fall exactly at 17:00.
