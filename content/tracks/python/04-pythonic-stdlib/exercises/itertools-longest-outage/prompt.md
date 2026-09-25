An uptime monitor checks a website once a minute and records `(time, status)` pairs, in time
order. Write `longest_outage(checks)` that finds the longest unbroken run of `"down"` checks and
returns `(start, end, minutes)`: the first and last times in the run, and how many checks it
contains.

```python
checks = [
    ("14:00", "up"), ("14:01", "down"), ("14:02", "down"), ("14:03", "up"),
    ("14:04", "down"), ("14:05", "down"), ("14:06", "down"), ("14:07", "up"),
]
longest_outage(checks)   # ("14:04", "14:06", 3)
```

If the site was never down, return `None`. If two outages are equally long, return the earlier one.
