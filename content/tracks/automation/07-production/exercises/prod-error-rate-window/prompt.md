The support bot's on-call alert fires when too many requests fail. The first version counted every
request since the process started, so one bad hour at 09:00 kept the alert firing until a deploy
reset it, and two failures out of three requests at 03:00 paged someone for nothing. Finish
`ErrorRateMonitor(*, window_seconds=300.0, min_requests=20, threshold=0.05)`:

- `record(ok, now)` records one request (`ok` is `False` for an error) at time `now`, in seconds.
- Only requests in the last `window_seconds` count: one at time `t` is in the window at `now` when
  `t > now - window_seconds`.
- `requests(now)` is how many are in the window, and `error_rate(now)` the share of them that
  failed (`0.0` when there are none).
- `should_alert(now)` is `True` when there are at least `min_requests` in the window **and** the
  error rate is **above** `threshold`.

It runs on every request of a busy service, so each call must be quick, not a scan of every request
ever recorded: the hidden test records 40,000 requests.

```python
monitor = ErrorRateMonitor(window_seconds=300, min_requests=20, threshold=0.05)
for second in range(100):
    monitor.record(ok=second % 10 != 0, now=second)     # 10 errors in 100 requests
monitor.error_rate(now=99), monitor.should_alert(now=99)   # (0.1, True)
monitor.should_alert(now=400)                              # False: every one of those has expired
```
