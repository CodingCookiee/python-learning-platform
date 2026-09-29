An agency gives you its list of "things we should automate". Turn it into a ranked backlog.

Write `rank_candidates(candidates, *, hourly_rate, max_payback=12)`. Each candidate is a dict:

```python
{
    "name": "Lead intake",
    "runs_per_month": 600,
    "minutes_per_run": 4,
    "build_cost": 3000,
    # optional keys, with their defaults:
    "error_rate": 0,               # fraction of runs a person gets wrong
    "cost_per_error": 0,
    "running_cost": 0,             # per month
    "stable": True,                # False: the process still changes month to month
}
```

The payback is worked out as in the last drill: time saved (at `hourly_rate`) plus errors
avoided, minus the running cost, divided into the build cost and rounded to one decimal place.

Return `(name, payback_months)` pairs for the candidates worth doing now, fastest payback first,
with ties in name order. Leave out candidates that:

- never pay back,
- take longer than `max_payback` months to pay back, or
- aren't stable yet.

```python
rank_candidates([lead_intake, invoice_chasing, board_report], hourly_rate=25)
# [("Lead intake", 3.0), ("Invoice chasing", 4.8)]
```
