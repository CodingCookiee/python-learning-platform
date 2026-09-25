Write `delivery_report(hours, late_after=48)` that summarises a list of delivery times, in hours,
as a dict:

- `deliveries`: how many there are,
- `mean`, `median` and `stdev` (the sample standard deviation), each rounded to 1 decimal place,
- `late`: how many took **more** than `late_after` hours.

```python
delivery_report([20, 22, 24, 23, 21, 96])
# {"deliveries": 6, "mean": 34.3, "median": 22.5, "stdev": 30.2, "late": 1}
```

A standard deviation needs at least two values, so fewer than two deliveries should raise
`ValueError`.
