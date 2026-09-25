Write `order_stats(amounts)` that takes a list of order amounts and returns three values as a tuple:
the number of orders, the total, and the average order value. Round the total and the average to
cents.

```python
order_stats([12.5, 30.0, 7.25])    # (3, 49.75, 16.58)

count, total, average = order_stats([12.5, 30.0, 7.25])
average                            # 16.58
```

A day with no orders has no average, so an empty list returns `(0, 0.0, None)`. Don't change the
list you were given.
