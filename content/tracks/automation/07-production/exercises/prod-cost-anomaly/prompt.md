The support bot's daily cost alert missed the $610 day: it compared each day with the average of
the whole month, spike included. Write `cost_anomalies(daily, *, window=7, factor=Decimal("2"),
min_history=3)`.

- `daily` is a list of `(day, cost)` pairs in date order: the day as `"YYYY-MM-DD"`, the cost as a
  `Decimal`.
- Each day's **baseline** is the median cost of the up-to-`window` days immediately before it.
  Never the day itself, and never a later day.
- A day is an anomaly when its cost is more than `factor` times its baseline.
- Days with fewer than `min_history` earlier days are skipped: there's nothing to compare with yet.

Return the anomalies as `Anomaly(day, cost, baseline)` (in the starter), in date order.

```python
daily = [("2026-09-28", Decimal("38.10")), ("2026-09-29", Decimal("41.90")), ("2026-09-30", Decimal("40.20")),
         ("2026-10-01", Decimal("39.75")), ("2026-10-02", Decimal("43.00")), ("2026-10-03", Decimal("40.60")),
         ("2026-10-04", Decimal("42.30")), ("2026-10-05", Decimal("610.45"))]
cost_anomalies(daily)
# [Anomaly(day='2026-10-05', cost=Decimal('610.45'), baseline=Decimal('40.60'))]
```
