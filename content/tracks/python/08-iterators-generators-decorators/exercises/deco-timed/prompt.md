The reporting service wants to know which jobs are slow. Write `timed(func, *, clock=time.perf_counter, threshold=1.0)`,
a decorator that times every call with `clock()`:

- `wrapper.stats` is a dict of `"calls"` (how many), `"total"` (seconds, summed) and `"slowest"`
  (the longest single call), starting at 0.
- `wrapper.slow_calls` is a list with a message for each call that took **more** than `threshold`
  seconds, like `"nightly_export took 1.50s"`.
- A call that raises is timed too, and the exception still reaches the caller.
- The decorated function keeps its name and docstring, and returns what the original returns.

Plain `@timed` uses the real clock. Tests call `timed` directly to pass a fake one:

```python
ticks = iter([0.0, 1.5, 10.0, 10.25])
def nightly_export():
    return "exported"

export = timed(nightly_export, clock=lambda: next(ticks))
export(), export()        # ("exported", "exported")
export.stats              # {"calls": 2, "total": 1.75, "slowest": 1.5}
export.slow_calls         # ["nightly_export took 1.50s"]
```
