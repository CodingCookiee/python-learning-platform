The on-call helper sometimes calls `get_error_rate` with the same arguments over and over, until
the step cap stops it. Catch that sooner. Write a `LoopDetector`:

```python
detector = LoopDetector(max_repeats=3, window=10)
detector.record(name, arguments) -> str | None
```

- `record` is called for every tool call the agent makes, in order.
- Two calls are the same when they have the same tool name and the same arguments. Argument order
  doesn't matter: `{"service": "checkout-api", "minutes": 15}` equals
  `{"minutes": 15, "service": "checkout-api"}`, at any depth.
- Only the last `window` calls (including this one) count.
- When this call has now been made `max_repeats` or more times within the window, return
  `"<name> was called <n> times with the same arguments"`. Otherwise return `None`.

```python
detector = LoopDetector()
detector.record("get_error_rate", {"service": "checkout-api"})   # None
detector.record("get_logs", {"service": "checkout-api"})         # None
detector.record("get_error_rate", {"service": "checkout-api"})   # None
detector.record("get_error_rate", {"service": "checkout-api"})   # "get_error_rate was called 3 times with the same arguments"
```
