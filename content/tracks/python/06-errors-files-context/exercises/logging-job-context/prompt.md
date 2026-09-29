Every step of a shop's nightly batch (import payments, send invoices, rebuild the stock report)
should leave the same trail in the logs: when it started, how long it took, and, if it failed, the
traceback. Write `logged_job(name, clock=time.monotonic)`, a context manager made with
`@contextmanager`, that logs through the module's logger:

| When | Level | Message |
|------|-------|---------|
| the block starts | `INFO` | `nightly import started` |
| the block finishes | `INFO` | `nightly import finished in 2.5s` |
| the block raises | `ERROR`, with the traceback attached | `nightly import failed after 0.8s` |

A failure is logged here, where the job's boundary is, and the exception still reaches the caller
unchanged. `clock` is a function returning the current time in seconds; call it once when the
block starts and once when it ends, and show the difference to one decimal place.

```python
with logged_job("nightly import"):
    import_payments()
# INFO solution: nightly import started
# INFO solution: nightly import finished in 2.5s
```

The tests pass in a fake clock, so the durations are predictable.
