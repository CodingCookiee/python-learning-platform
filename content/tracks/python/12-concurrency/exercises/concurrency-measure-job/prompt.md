Build the tool the ops team used to take their measurements. Write
`profile(job, *args, wall_clock=time.perf_counter, cpu_clock=time.process_time, **kwargs)`:

- It calls `job(*args, **kwargs)` and reads both clocks before and after.
- It returns a `Profile` (a frozen dataclass you define) with four fields: `result` (what the job
  returned), `wall_seconds` and `cpu_seconds`, each rounded to 3 decimal places, and `kind`.
- `kind` is `"cpu-bound"` when CPU time is at least 0.8 of wall time, `"io-bound"` when it's at
  most 0.2, and `"mixed"` otherwise. A job that took no wall time at all is `"instant"`.
- If the job raises, the exception propagates unchanged.

The clocks are parameters so the tests can pass their own, as the lesson on dates did for `now`.
Always call the ones you're given.

```python
report = profile(export_invoices, "2026-09", wall_clock=fake_wall, cpu_clock=fake_cpu)
report
# Profile(result=412, wall_seconds=12.0, cpu_seconds=0.8, kind='io-bound')
```
