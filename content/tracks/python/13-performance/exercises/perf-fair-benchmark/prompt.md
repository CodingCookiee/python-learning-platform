The team's benchmark says sorting in place is several times faster than `sorted()`, and after it
runs, the caller's list of latencies has mysteriously become sorted:

```python
latencies = [0.31, 0.02, 0.18, 0.27, 0.05]
race({"sorted": sorted, "in place": list.sort}, latencies)
# {'in place': 1.1e-06, 'sorted': 2.3e-06}   ← in place only sorted random data once
latencies
# [0.02, 0.05, 0.18, 0.27, 0.31]             ← the caller's data was changed
```

Fix `race` so that:

- every run of every candidate gets its own copy of `data`, in its original order;
- the caller's `data` is never changed;
- making the copy happens **before** the clock starts, so it isn't counted in the time.

Keep the rest as it is: `race` returns a dict of candidate name to best time, fastest first.
