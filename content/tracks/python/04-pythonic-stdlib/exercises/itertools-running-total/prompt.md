A sales dashboard shows the month's revenue so far, day by day. Write `running_totals(daily_sales)`
that returns a list of running totals: each day's sales plus every day before it.

```python
running_totals([120, 80, 200])   # [120, 200, 400]
```

Refunds make some days negative, and an empty month gives an empty list.
