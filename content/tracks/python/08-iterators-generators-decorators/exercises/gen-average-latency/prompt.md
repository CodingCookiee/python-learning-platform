The API gateway reports response times one at a time, and the dashboard wants the average so far
after each one. Write a generator function `average_latency(window=None)` that works as a
coroutine:

- Prime it with `next()`, which yields `None` because there are no readings yet.
- Each `send(ms)` records a reading and returns the average of the readings, rounded to 1 decimal
  place.
- With a `window`, the average covers only the most recent `window` readings. Without one, it
  covers all of them.

```python
monitor = average_latency()
next(monitor)        # None
monitor.send(120)    # 120.0
monitor.send(80)     # 100.0
monitor.send(310)    # 170.0
```
