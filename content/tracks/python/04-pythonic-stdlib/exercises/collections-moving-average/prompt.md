A monitoring dashboard smooths out response times with a moving average. Write
`moving_average(values, window)` that returns the average of each run of `window` consecutive
values, rounded to 1 decimal place. The first average appears once `window` values have arrived.

```python
moving_average([100, 120, 110, 130, 90], 3)   # [110.0, 120.0, 110.0]
```

The values may arrive as a one-pass stream, such as an iterator, rather than a list, so read them
only once. If there are fewer values than `window`, return an empty list.
