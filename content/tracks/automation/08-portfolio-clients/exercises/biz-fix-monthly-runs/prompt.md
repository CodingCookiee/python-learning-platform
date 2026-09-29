Clients describe how often things happen in whatever unit comes to mind: "about 30 a day", "three
times a week", "twice a year". `runs_per_month(count, per)` turns that into runs per month, the
number every ROI estimate starts from, rounded to one decimal place. `per` is one of `"day"`,
`"working day"`, `"week"`, `"month"` or `"year"`.

A logistics company says it gets 30 delivery-exception emails per working day. The converter says
900 a month, which overstates the saving by almost 40%. Fix the table so every unit converts
correctly: a year has 365 days and 52 weeks, and a working week has five days (ignore holidays).

```python
runs_per_month(30, "working day")
# Decimal("650.0")
```
