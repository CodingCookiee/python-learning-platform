Write the calculator you'll use when quoting. `payback_months(...)` takes keyword-only arguments:

| Argument | Meaning |
|----------|---------|
| `runs_per_month` | how many times the task happens a month |
| `minutes_per_run` | how long a person takes each time |
| `hourly_rate` | what that person's time costs, per hour |
| `build_cost` | your quote for building the automation |
| `error_rate` | the fraction of runs a person gets wrong (default `0`) |
| `cost_per_error` | what one mistake costs (default `0`) |
| `running_cost_per_month` | hosting, fees and maintenance (default `0`) |

The monthly saving is the value of the time saved plus the cost of the errors avoided, minus the
running cost. Return how many months the build takes to pay for itself, rounded to one decimal
place, or `None` if the saving is zero or negative (it never pays back).

The clinic's reminders from the lesson:

```python
payback_months(
    runs_per_month=400, minutes_per_run=3, hourly_rate=18,
    error_rate=0.02, cost_per_error=60,
    build_cost=2400, running_cost_per_month=40,
)
# 3.0
```
