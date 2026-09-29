Write `timed(fn, *args, clock=time.perf_counter)`. It calls `fn(*args)` exactly once and returns
a tuple of the call's result and how long the call took, in **milliseconds**.

Read the clock immediately before the call and immediately after it, and nowhere else. Taking the
clock as a parameter means a test can hand in a fake one that returns scripted readings:

```python
readings = iter([12.0, 12.25])
timed(sum, [4, 5, 6], clock=lambda: next(readings))
# (15, 250.0)
```

Called without `clock`, it uses `time.perf_counter`.
