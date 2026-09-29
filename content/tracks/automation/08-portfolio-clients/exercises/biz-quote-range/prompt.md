Before a full scope, a single price is a guess. Quote a range instead, list what it assumes, and
check it against what the project is worth to the client. Write
`quote_range(tasks, *, hourly_rate, buffer=Decimal("0.15"), first_year_value=None)`.

Each task is `{"name": ..., "low": hours, "high": hours}`, with an optional `"assumption"` string.
Raise `ValueError`, with the task's name in the message, if a task's `low` is negative or more than
its `high`. Otherwise return a dict:

| Key | Value |
|-----|-------|
| `low` | the total low hours × `hourly_rate`, rounded **down** to a multiple of 50 |
| `high` | the total high hours × (1 + `buffer`) × `hourly_rate`, rounded **up** to a multiple of 50 |
| `assumptions` | the tasks' assumptions, in task order, leaving out missing and blank ones |
| `uncertain` | the names of tasks whose high estimate is at least twice the low one: ask about these before you fix a price |
| `value_check` | `None` without a `first_year_value`; otherwise `"comfortable"` if `high` is at most half of it, `"tight"` if `high` is at most all of it, and `"hard to justify"` if it's more |

```python
quote_range(REPORTS, hourly_rate=60, first_year_value=9600)   # REPORTS is in the tests
# {"low": Decimal("1800"), "high": Decimal("3750"),
#  "assumptions": ["The agency gives us API access to both ad accounts",
#                  "An account manager reviews each summary before it's sent"],
#  "uncertain": ["Connect ad platforms", "AI summaries"],
#  "value_check": "comfortable"}
```

30 hours at 60 is 1,800. 54 hours plus 15% is 62.1 hours, 3,726 at 60, which rounds up to 3,750. The
numbers are examples.
